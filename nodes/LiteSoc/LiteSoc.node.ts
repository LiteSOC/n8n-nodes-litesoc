import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { alertFields, alertOperations } from './descriptions/AlertDescription';
import { eventFields, eventOperations } from './descriptions/EventDescription';
import {
	buildActor,
	litesocApiRequest,
	litesocApiRequestAllItems,
	parseMetadata,
} from './GenericFunctions';

export class LiteSoc implements INodeType {
	description: INodeTypeDescription = {
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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
			// Alert operations and fields
			...alertOperations,
			...alertFields,
			// Event operations and fields
			...eventOperations,
			...eventFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[];

				// ========================================
				//              EVENT
				// ========================================
				if (resource === 'event') {
					// ----------------------------------
					//         event:create
					// ----------------------------------
					if (operation === 'create') {
						let eventType = this.getNodeParameter('eventType', i) as string;

						// Handle custom event type
						if (eventType === 'custom') {
							eventType = this.getNodeParameter('customEventType', i) as string;
							if (!eventType.includes('.')) {
								throw new NodeOperationError(
									this.getNode(),
									'Custom event type must be in format category.action (e.g., billing.payment_failed)',
								);
							}
						}

						const actorId = this.getNodeParameter('actorId', i) as string;
						const actorEmail = this.getNodeParameter('actorEmail', i, '') as string;
						const userIp = this.getNodeParameter('userIp', i, '') as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						const metadataCollection = this.getNodeParameter('metadata', i, {}) as IDataObject;

						// Build the event payload
						const body: IDataObject = {
							event: eventType,
							actor: buildActor(actorId, actorEmail),
						};

						// Add optional fields
						if (userIp) {
							body.user_ip = userIp;
						}

						if (additionalFields.timestamp) {
							body.timestamp = additionalFields.timestamp;
						}

						// Parse and add metadata
						if (metadataCollection.metadataValues) {
							const metadataItems = metadataCollection.metadataValues as IDataObject[];
							if (metadataItems.length > 0) {
								body.metadata = parseMetadata(metadataItems);
							}
						}

						responseData = (await litesocApiRequest.call(
							this,
							'POST',
							'/collect',
							body,
						)) as IDataObject;
					}

					// ----------------------------------
					//         event:get
					// ----------------------------------
					else if (operation === 'get') {
						const eventId = this.getNodeParameter('eventId', i) as string;

						responseData = (await litesocApiRequest.call(
							this,
							'GET',
							`/events/${eventId}`,
						)) as IDataObject;
					}

					// ----------------------------------
					//         event:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

						const qs: IDataObject = {};

						// Apply filters
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
							responseData = await litesocApiRequestAllItems.call(
								this,
								'GET',
								'/events',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
							const response = (await litesocApiRequest.call(
								this,
								'GET',
								'/events',
								{},
								qs,
							)) as IDataObject;
							responseData =
								(response.data as IDataObject[]) ||
								(response.events as IDataObject[]) ||
								[];
						}
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Operation "${operation}" is not supported for event resource`,
						);
					}
				}

				// ========================================
				//              ALERT
				// ========================================
				else if (resource === 'alert') {
					// ----------------------------------
					//         alert:get
					// ----------------------------------
					if (operation === 'get') {
						const alertId = this.getNodeParameter('alertId', i) as string;

						responseData = (await litesocApiRequest.call(
							this,
							'GET',
							`/alerts/${alertId}`,
						)) as IDataObject;
					}

					// ----------------------------------
					//         alert:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

						const qs: IDataObject = {};

						// Apply filters
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
							responseData = await litesocApiRequestAllItems.call(
								this,
								'GET',
								'/alerts/list',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
							const response = (await litesocApiRequest.call(
								this,
								'GET',
								'/alerts/list',
								{},
								qs,
							)) as IDataObject;
							responseData =
								(response.data as IDataObject[]) ||
								(response.alerts as IDataObject[]) ||
								[];
						}
					}

					// ----------------------------------
					//         alert:resolve
					// ----------------------------------
					else if (operation === 'resolve') {
						const alertId = this.getNodeParameter('alertId', i) as string;
						const resolutionType = this.getNodeParameter('resolutionType', i) as string;
						const internalNotes = this.getNodeParameter('internalNotes', i, '') as string;

						const body: IDataObject = {
							action: 'resolve',
							resolution_type: resolutionType,
						};

						if (internalNotes) {
							body.internal_notes = internalNotes;
						}

						responseData = (await litesocApiRequest.call(
							this,
							'PATCH',
							`/alerts/${alertId}`,
							body,
						)) as IDataObject;
					}

					// ----------------------------------
					//         alert:markSafe
					// ----------------------------------
					else if (operation === 'markSafe') {
						const alertId = this.getNodeParameter('alertId', i) as string;
						const internalNotes = this.getNodeParameter('internalNotes', i, '') as string;

						const body: IDataObject = {
							action: 'mark_safe',
						};

						if (internalNotes) {
							body.internal_notes = internalNotes;
						}

						responseData = (await litesocApiRequest.call(
							this,
							'PATCH',
							`/alerts/${alertId}`,
							body,
						)) as IDataObject;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Operation "${operation}" is not supported for alert resource`,
						);
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Resource "${resource}" is not supported`,
					);
				}

				// Handle array vs single object response
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
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
