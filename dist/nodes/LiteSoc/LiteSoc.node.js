"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteSoc = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const AlertDescription_1 = require("./descriptions/AlertDescription");
const EventDescription_1 = require("./descriptions/EventDescription");
const GenericFunctions_1 = require("./GenericFunctions");
class LiteSoc {
    description = {
        displayName: 'LiteSOC',
        name: 'liteSoc',
        icon: 'file:LiteSoc.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Track security events and manage alerts with LiteSOC. Severity is automatically assigned based on event type.',
        defaults: {
            name: 'LiteSOC',
        },
        usableAsTool: true,
        inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
        outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'liteSocApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                required: true,
                options: [
                    {
                        name: 'Alert',
                        value: 'alert',
                        description: 'Manage security alerts. Each alert includes severity (critical/high/medium/low) auto-assigned by LiteSOC.',
                    },
                    {
                        name: 'Event',
                        value: 'event',
                        description: 'Track and retrieve security events. Each event includes severity (critical/warning/info) auto-assigned by LiteSOC based on event type.',
                    },
                ],
                default: 'event',
            },
            ...AlertDescription_1.alertOperations,
            ...AlertDescription_1.alertFields,
            ...EventDescription_1.eventOperations,
            ...EventDescription_1.eventFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                let responseData;
                if (resource === 'event') {
                    if (operation === 'create') {
                        let eventType = this.getNodeParameter('eventType', i);
                        if (eventType === 'custom') {
                            eventType = this.getNodeParameter('customEventType', i);
                            if (!eventType.includes('.')) {
                                throw new Error('Custom event type must be in format category.action (e.g., billing.payment_failed)');
                            }
                        }
                        const actorId = this.getNodeParameter('actorId', i);
                        const actorEmail = this.getNodeParameter('actorEmail', i, '');
                        const userIp = this.getNodeParameter('userIp', i, '');
                        const additionalFields = this.getNodeParameter('additionalFields', i, {});
                        const metadataCollection = this.getNodeParameter('metadata', i, {});
                        const body = {
                            event: eventType,
                            actor: (0, GenericFunctions_1.buildActor)(actorId, actorEmail),
                        };
                        if (userIp) {
                            body.user_ip = userIp;
                        }
                        if (additionalFields.timestamp) {
                            body.timestamp = additionalFields.timestamp;
                        }
                        if (metadataCollection.metadataValues) {
                            const metadataItems = metadataCollection.metadataValues;
                            if (metadataItems.length > 0) {
                                body.metadata = (0, GenericFunctions_1.parseMetadata)(metadataItems);
                            }
                        }
                        responseData = (await GenericFunctions_1.litesocApiRequest.call(this, 'POST', '/collect', body));
                    }
                    else if (operation === 'get') {
                        const eventId = this.getNodeParameter('eventId', i);
                        responseData = (await GenericFunctions_1.litesocApiRequest.call(this, 'GET', `/events/${eventId}`));
                    }
                    else if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i, {});
                        const qs = {};
                        if (filters.eventType) {
                            qs.event_type = filters.eventType;
                        }
                        if (filters.actorId) {
                            qs.actor_id = filters.actorId;
                        }
                        if (filters.severity) {
                            qs.severity = filters.severity;
                        }
                        if (filters.startDate) {
                            qs.start_date = filters.startDate;
                        }
                        if (filters.endDate) {
                            qs.end_date = filters.endDate;
                        }
                        if (returnAll) {
                            responseData = await GenericFunctions_1.litesocApiRequestAllItems.call(this, 'GET', '/events', {}, qs);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            qs.limit = limit;
                            const response = (await GenericFunctions_1.litesocApiRequest.call(this, 'GET', '/events', {}, qs));
                            responseData =
                                response.data ||
                                    response.events ||
                                    [];
                        }
                    }
                    else {
                        throw new Error(`Operation "${operation}" is not supported for event resource`);
                    }
                }
                else if (resource === 'alert') {
                    if (operation === 'get') {
                        const alertId = this.getNodeParameter('alertId', i);
                        responseData = (await GenericFunctions_1.litesocApiRequest.call(this, 'GET', `/alerts/${alertId}`));
                    }
                    else if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i, {});
                        const qs = {};
                        if (filters.alertType) {
                            qs.alert_type = filters.alertType;
                        }
                        if (filters.severity) {
                            qs.severity = filters.severity;
                        }
                        if (filters.status) {
                            qs.status = filters.status;
                        }
                        if (filters.actorId) {
                            qs.actor_id = filters.actorId;
                        }
                        if (filters.startDate) {
                            qs.start_date = filters.startDate;
                        }
                        if (filters.endDate) {
                            qs.end_date = filters.endDate;
                        }
                        if (returnAll) {
                            responseData = await GenericFunctions_1.litesocApiRequestAllItems.call(this, 'GET', '/alerts/list', {}, qs);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            qs.limit = limit;
                            const response = (await GenericFunctions_1.litesocApiRequest.call(this, 'GET', '/alerts/list', {}, qs));
                            responseData =
                                response.data ||
                                    response.alerts ||
                                    [];
                        }
                    }
                    else if (operation === 'resolve') {
                        const alertId = this.getNodeParameter('alertId', i);
                        const resolutionType = this.getNodeParameter('resolutionType', i);
                        const internalNotes = this.getNodeParameter('internalNotes', i, '');
                        const body = {
                            action: 'resolve',
                            resolution_type: resolutionType,
                        };
                        if (internalNotes) {
                            body.internal_notes = internalNotes;
                        }
                        responseData = (await GenericFunctions_1.litesocApiRequest.call(this, 'PATCH', `/alerts/${alertId}`, body));
                    }
                    else if (operation === 'markSafe') {
                        const alertId = this.getNodeParameter('alertId', i);
                        const internalNotes = this.getNodeParameter('internalNotes', i, '');
                        const body = {
                            action: 'mark_safe',
                        };
                        if (internalNotes) {
                            body.internal_notes = internalNotes;
                        }
                        responseData = (await GenericFunctions_1.litesocApiRequest.call(this, 'PATCH', `/alerts/${alertId}`, body));
                    }
                    else {
                        throw new Error(`Operation "${operation}" is not supported for alert resource`);
                    }
                }
                else {
                    throw new Error(`Resource "${resource}" is not supported`);
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.LiteSoc = LiteSoc;
//# sourceMappingURL=LiteSoc.node.js.map