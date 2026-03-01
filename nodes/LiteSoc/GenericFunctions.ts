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
const LITESOC_NODE_VERSION = '1.2.0';

// Production API URL
const LITESOC_API_BASE_URL = 'https://api.litesoc.io';

/**
 * Make an authenticated API request to LiteSOC
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
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'liteSocApi',
			options,
		);
		return response as IDataObject | IDataObject[];
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

	let page = 1;
	const pageSize = 100;
	let hasMore = true;

	while (hasMore) {
		qs.page = page;
		qs.limit = pageSize;

		const response = (await litesocApiRequest.call(this, method, endpoint, body, qs)) as IDataObject;

		const items = (response.data as IDataObject[]) || (response.items as IDataObject[]) || [];
		returnData.push(...items);

		// Check if we have more pages
		const total = (response.total as number) || 0;
		const currentCount = returnData.length;

		if (currentCount >= total || items.length < pageSize) {
			hasMore = false;
		}

		// Check if we've hit the limit
		if (limit && returnData.length >= limit) {
			return returnData.slice(0, limit);
		}

		page++;
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
