"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.litesocApiRequest = litesocApiRequest;
exports.litesocApiRequestAllItems = litesocApiRequestAllItems;
exports.formatEventType = formatEventType;
exports.validateSeverity = validateSeverity;
exports.buildActor = buildActor;
exports.parseMetadata = parseMetadata;
const n8n_workflow_1 = require("n8n-workflow");
const LITESOC_NODE_VERSION = '1.0.0';
const LITESOC_API_BASE_URL = 'https://api.litesoc.io';
async function litesocApiRequest(method, endpoint, body = {}, qs = {}) {
    const options = {
        method,
        url: `${LITESOC_API_BASE_URL}${endpoint}`,
        json: true,
        headers: {
            'User-Agent': `n8n-litesoc-node/${LITESOC_NODE_VERSION}`,
        },
    };
    if (method !== 'GET' && Object.keys(body).length > 0) {
        options.body = body;
    }
    if (Object.keys(qs).length > 0) {
        options.qs = qs;
    }
    try {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'liteSocApi', options);
        return response;
    }
    catch (error) {
        const err = error;
        const statusCode = err.cause?.code || err.statusCode || err.httpCode;
        const errorBody = err.cause?.body || err.response?.body;
        const errorCode = errorBody?.error?.code || '';
        const errorMessage = errorBody?.error?.message || '';
        const apiMessage = errorMessage || err.message || err.description || '';
        let userMessage = 'LiteSOC API request failed';
        let httpCode;
        if (errorCode === 'PLAN_RESTRICTED') {
            userMessage = 'This action requires a Pro or Enterprise plan. Please upgrade your LiteSOC account at https://www.litesoc.io/pricing';
            httpCode = '403';
        }
        else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
            const retryAfter = errorBody?.error?.retry_after || 60;
            userMessage = `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying. Consider increasing your polling interval.`;
            httpCode = '429';
        }
        else if (errorCode === 'UNAUTHORIZED') {
            userMessage = 'Invalid API Key. Please check your LiteSOC credentials.';
            httpCode = '401';
        }
        else {
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
        if (apiMessage && !userMessage.includes(apiMessage) && apiMessage !== 'LiteSOC API request failed') {
            userMessage = `${userMessage} Details: ${apiMessage}`;
        }
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, {
            message: userMessage,
            httpCode,
        });
    }
}
async function litesocApiRequestAllItems(method, endpoint, body = {}, qs = {}, limit) {
    const returnData = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;
    while (hasMore) {
        qs.page = page;
        qs.limit = pageSize;
        const response = (await litesocApiRequest.call(this, method, endpoint, body, qs));
        const items = response.data || response.items || [];
        returnData.push(...items);
        const total = response.total || 0;
        const currentCount = returnData.length;
        if (currentCount >= total || items.length < pageSize) {
            hasMore = false;
        }
        if (limit && returnData.length >= limit) {
            return returnData.slice(0, limit);
        }
        page++;
    }
    return returnData;
}
function formatEventType(eventType) {
    if (!eventType.includes('.')) {
        throw new Error('Event type must be in format: category.action (e.g., auth.login_failed)');
    }
    return eventType.toLowerCase().trim();
}
function validateSeverity(severity) {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const normalizedSeverity = severity.toLowerCase().trim();
    if (!validSeverities.includes(normalizedSeverity)) {
        throw new Error(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
    }
    return normalizedSeverity;
}
function buildActor(actorId, actorEmail) {
    if (!actorId && !actorEmail) {
        return null;
    }
    const actor = {};
    if (actorId) {
        actor.id = actorId;
    }
    if (actorEmail) {
        actor.email = actorEmail;
    }
    return actor;
}
function parseMetadata(metadataItems) {
    const metadata = {};
    for (const item of metadataItems) {
        if (item.key && item.value !== undefined) {
            metadata[item.key] = item.value;
        }
    }
    return metadata;
}
//# sourceMappingURL=GenericFunctions.js.map