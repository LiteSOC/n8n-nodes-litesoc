/**
 * Mock for n8n-workflow module
 * Provides minimal implementations for testing
 */

// Node connection types enum
export const NodeConnectionTypes = {
  Main: 'main',
} as const;

// Mock NodeApiError class
export class NodeApiError extends Error {
  httpCode?: string;
  
  constructor(
    node: unknown,
    error: unknown,
    options?: { message?: string; httpCode?: string }
  ) {
    super(options?.message || 'Node API Error');
    this.name = 'NodeApiError';
    this.httpCode = options?.httpCode;
  }
}

// Mock NodeOperationError class
export class NodeOperationError extends Error {
  constructor(node: unknown, message: string) {
    super(message);
    this.name = 'NodeOperationError';
  }
}

// Type definitions (minimal for testing)
export interface IDataObject {
  [key: string]: unknown;
}

export interface INodeExecutionData {
  json: IDataObject;
  pairedItem?: { item: number };
}

export interface INodeType {
  description: INodeTypeDescription;
  execute: () => Promise<INodeExecutionData[][]>;
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon?: string;
  group: string[];
  version: number;
  subtitle?: string;
  description: string;
  defaults: { name: string };
  usableAsTool?: boolean;
  inputs: string[];
  outputs: string[];
  credentials?: Array<{ name: string; required: boolean }>;
  properties: INodeProperties[];
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ name: string; value: string; description?: string }>;
  displayOptions?: { show?: Record<string, unknown[]> };
  description?: string;
  [key: string]: unknown;
}

export interface IExecuteFunctions {
  getInputData: () => INodeExecutionData[];
  getNodeParameter: (name: string, index: number, fallback?: unknown) => unknown;
  getNode: () => { name: string };
  continueOnFail: () => boolean;
  helpers: {
    httpRequestWithAuthentication: (
      credentialType: string,
      options: IHttpRequestOptions
    ) => Promise<unknown>;
    constructExecutionMetaData: (
      data: INodeExecutionData[],
      options: { itemData: { item: number } }
    ) => INodeExecutionData[];
    returnJsonArray: (data: unknown) => INodeExecutionData[];
  };
}

export interface IHookFunctions {
  getNode: () => { name: string };
  helpers: {
    httpRequestWithAuthentication: (
      credentialType: string,
      options: IHttpRequestOptions
    ) => Promise<unknown>;
  };
}

export interface ILoadOptionsFunctions {
  getNode: () => { name: string };
  helpers: {
    httpRequestWithAuthentication: (
      credentialType: string,
      options: IHttpRequestOptions
    ) => Promise<unknown>;
  };
}

export interface IWebhookFunctions {
  getNode: () => { name: string };
  helpers: {
    httpRequestWithAuthentication: (
      credentialType: string,
      options: IHttpRequestOptions
    ) => Promise<unknown>;
  };
}

export interface IHttpRequestOptions {
  method: IHttpRequestMethods;
  url: string;
  json?: boolean;
  headers?: Record<string, string>;
  body?: unknown;
  qs?: Record<string, unknown>;
}

export type IHttpRequestMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type JsonObject = Record<string, unknown>;

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: INodeProperties[];
  authenticate?: IAuthenticateGeneric;
  test?: ICredentialTestRequest;
}

export interface IAuthenticateGeneric {
  type: 'generic';
  properties: {
    headers?: Record<string, string>;
    qs?: Record<string, string>;
  };
}

export interface ICredentialTestRequest {
  request: {
    baseURL: string;
    url: string;
    method: string;
  };
}
