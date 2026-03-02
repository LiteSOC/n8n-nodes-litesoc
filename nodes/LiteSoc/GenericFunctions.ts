import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// LiteSOC n8n Node version - used for User-Agent header
const LITESOC_NODE_VERSION = '1.4.0';

// Production API URL
const LITESOC_API_BASE_URL = 'https://api.litesoc.io';

/**
 * Plan metadata extracted from API response headers
 * These headers are returned with every LiteSOC API response
 */
export interface LiteSOCPlanMetadata {
	/** Current plan: 'free', 'pro', or 'enterprise' */
	plan: string | null;
	/** Data retention period in days */
	retentionDays: number | null;
	/** Oldest accessible data date (ISO 8601) */
	cutoffDate: string | null;
}

/**
 * Extended response that includes plan metadata
 */
export interface LiteSOCApiResponse {
	data: IDataObject | IDataObject[];
	_planMetadata?: LiteSOCPlanMetadata;
}

/**
 * Parse plan metadata from API response headers
 * Extracts X-LiteSOC-Plan, X-LiteSOC-Retention, and X-LiteSOC-Cutoff
 */
export function parsePlanMetadataFromHeaders(headers: Record<string, string>): LiteSOCPlanMetadata {
	// Normalize header keys to lowercase for case-insensitive access
	const normalizedHeaders: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		normalizedHeaders[key.toLowerCase()] = value;
	}

	const plan = normalizedHeaders['x-litesoc-plan'] || null;
	
	// Parse retention days - API returns "30 days" or "30" format
	let retentionDays: number | null = null;
	const retentionStr = normalizedHeaders['x-litesoc-retention'];
	if (retentionStr) {
		const cleaned = retentionStr.replace(/\s*days?\s*/gi, '').trim();
		const parsed = parseInt(cleaned, 10);
		if (!isNaN(parsed)) {
			retentionDays = parsed;
		}
	}

	const cutoffDate = normalizedHeaders['x-litesoc-cutoff'] || null;

	return { plan, retentionDays, cutoffDate };
}

/**
 * Make an authenticated API request to LiteSOC
 * Extracts plan metadata from response headers and includes it in the response
 */
export async function litesocApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject | IDataObject[]> {
	const options: IHttpRequestOptions = {
		method,
		url: `${LITESOC_API_BASE_URL}${endpoint}`,
		json: true,
		returnFullResponse: true, // Get headers along with body
		headers: {
			'User-Agent': `n8n-litesoc-node/${LITESOC_NODE_VERSION}`,
		},
	};

	// Add body for non-GET requests
	if (method !== 'GET' && Object.keys(body).length > 0) {
		options.body = body;
	}

	// Add query string if present
	if (Object.keys(qs).length > 0) {
		options.qs = qs;
	}

	try {
		const fullResponse = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'liteSocApi',
			options,
		) as { body: IDataObject | IDataObject[]; headers: Record<string, string> };

		// Extract plan metadata from headers
		const planMetadata = parsePlanMetadataFromHeaders(fullResponse.headers || {});
		
		// If the response is an object, attach plan metadata
		const responseBody = fullResponse.body;
		if (responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)) {
			// Attach plan metadata to response for visibility in n8n
			(responseBody as IDataObject)._planMetadata = planMetadata as unknown as IDataObject;
		}

		return responseBody;
	} catch (error) {
		const err = error as JsonObject & { 
			cause?: { code?: number; body?: JsonObject }; 
			statusCode?: number; 
			httpCode?: number;
			response?: { body?: JsonObject };
		};
		const statusCode = err.cause?.code || err.statusCode || err.httpCode;
		
		// Try to parse JSON error response from backend
		const errorBody = err.cause?.body || err.response?.body;
		const errorCode = (errorBody?.error as JsonObject)?.code as string || '';
		const errorMessage = (errorBody?.error as JsonObject)?.message as string || '';
		const apiMessage = errorMessage || (err.message as string) || (err.description as string) || '';

		let userMessage = 'LiteSOC API request failed';
		let httpCode: string | undefined;

		// First check for specific error codes from the backend
		if (errorCode === 'PLAN_RESTRICTED') {
			userMessage = 'This action requires a Pro or Enterprise plan. Please upgrade your LiteSOC account at https://www.litesoc.io/pricing';
			httpCode = '403';
		} else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
			const retryAfter = (errorBody?.error as JsonObject)?.retry_after || 60;
			userMessage = `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying. Consider increasing your polling interval.`;
			httpCode = '429';
		} else if (errorCode === 'UNAUTHORIZED') {
			userMessage = 'Invalid API Key. Please check your LiteSOC credentials.';
			httpCode = '401';
		} else {
			// Fall back to status code based error handling
			switch (statusCode) {
				case 401:
					userMessage = 'Invalid API Key. Please check your credentials.';
					httpCode = '401';
					break;
				case 403:
					userMessage = 'Feature Restricted. Your current LiteSOC plan does not support this action. Upgrade to Pro at https://www.litesoc.io/pricing';
					httpCode = '403';
					break;
				case 429:
					userMessage = 'Rate Limit Exceeded. n8n is polling too fast. Please increase the polling interval.';
					httpCode = '429';
					break;
				case 500:
				case 502:
				case 503:
				case 504:
					userMessage = 'LiteSOC API is currently unavailable. Please try again later.';
					httpCode = String(statusCode);
					break;
				case 404:
					userMessage = 'Resource not found. The requested alert or event does not exist.';
					httpCode = '404';
					break;
				case 400:
					userMessage = apiMessage || 'Invalid request. Please check the parameters.';
					httpCode = '400';
					break;
				default:
					userMessage = apiMessage || 'LiteSOC API request failed';
			}
		}

		// Append API message if different from userMessage and not empty
		if (apiMessage && !userMessage.includes(apiMessage) && apiMessage !== 'LiteSOC API request failed') {
			userMessage = `${userMessage} Details: ${apiMessage}`;
		}

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: userMessage,
			httpCode,
		});
	}
}

/**
 * Make an authenticated API request to LiteSOC and return all items (with pagination)
 */
export async function litesocApiRequestAllItems(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	limit?: number,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];

	let offset = 0;
	const pageSize = 100;
	let hasMore = true;

	while (hasMore) {
		qs.offset = offset;
		qs.limit = pageSize;

		const response = (await litesocApiRequest.call(this, method, endpoint, body, qs)) as IDataObject;

		const items = (response.data as IDataObject[]) || (response.items as IDataObject[]) || [];
		returnData.push(...items);

		// Check if we have more pages - read from pagination object
		const pagination = response.pagination as IDataObject | undefined;
		const total = (pagination?.total as number) || (response.total as number) || 0;
		const currentCount = returnData.length;

		if (currentCount >= total || items.length < pageSize) {
			hasMore = false;
		}

		// Check if we've hit the limit
		if (limit && returnData.length >= limit) {
			return returnData.slice(0, limit);
		}

		offset += pageSize;
	}

	return returnData;
}

/**
 * Validate and format event type
 */
export function formatEventType(eventType: string): string {
	// Event types should be in format: category.action
	if (!eventType.includes('.')) {
		throw new Error('Event type must be in format: category.action (e.g., auth.login_failed)');
	}
	return eventType.toLowerCase().trim();
}

/**
 * Validate severity level
 */
export function validateSeverity(severity: string): string {
	const validSeverities = ['low', 'medium', 'high', 'critical'];
	const normalizedSeverity = severity.toLowerCase().trim();

	if (!validSeverities.includes(normalizedSeverity)) {
		throw new Error(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
	}

	return normalizedSeverity;
}

/**
 * Build actor object from parameters
 */
export function buildActor(
	actorId?: string,
	actorEmail?: string,
): IDataObject | null {
	if (!actorId && !actorEmail) {
		return null;
	}

	const actor: IDataObject = {};

	if (actorId) {
		actor.id = actorId;
	}

	if (actorEmail) {
		actor.email = actorEmail;
	}

	return actor;
}

/**
 * Parse metadata from key-value pairs
 */
export function parseMetadata(metadataItems: IDataObject[]): IDataObject {
	const metadata: IDataObject = {};

	for (const item of metadataItems) {
		if (item.key && item.value !== undefined) {
			metadata[item.key as string] = item.value;
		}
	}

	return metadata;
}
