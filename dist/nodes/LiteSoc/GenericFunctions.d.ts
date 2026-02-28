import type { IDataObject, IExecuteFunctions, IHookFunctions, IHttpRequestMethods, ILoadOptionsFunctions, IWebhookFunctions } from 'n8n-workflow';
export declare function litesocApiRequest(this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject): Promise<IDataObject | IDataObject[]>;
export declare function litesocApiRequestAllItems(this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject, limit?: number): Promise<IDataObject[]>;
export declare function formatEventType(eventType: string): string;
export declare function validateSeverity(severity: string): string;
export declare function buildActor(actorId?: string, actorEmail?: string): IDataObject | null;
export declare function parseMetadata(metadataItems: IDataObject[]): IDataObject;
//# sourceMappingURL=GenericFunctions.d.ts.map