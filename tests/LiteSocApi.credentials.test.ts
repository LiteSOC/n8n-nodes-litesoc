/**
 * Tests for LiteSocApi Credentials
 * Covers credential configuration and authentication setup
 */

import { LiteSocApi } from '../nodes/credentials/LiteSocApi.credentials';

describe('LiteSocApi Credentials', () => {
  let credentials: LiteSocApi;

  beforeEach(() => {
    credentials = new LiteSocApi();
  });

  describe('Basic Configuration', () => {
    it('should have correct name', () => {
      expect(credentials.name).toBe('liteSocApi');
    });

    it('should have correct display name', () => {
      expect(credentials.displayName).toBe('LiteSOC API');
    });

    it('should have documentation URL', () => {
      expect(credentials.documentationUrl).toBe('https://www.litesoc.io/docs/api');
    });

    it('should have icon configuration for light and dark modes', () => {
      expect(credentials.icon).toEqual({
        light: 'file:LiteSoc.svg',
        dark: 'file:LiteSoc.svg',
      });
    });
  });

  describe('HTTP Request Node Configuration', () => {
    it('should have httpRequestNode configuration', () => {
      expect(credentials.httpRequestNode).toBeDefined();
      expect(credentials.httpRequestNode.name).toBe('LiteSOC');
      expect(credentials.httpRequestNode.docsUrl).toBe('https://www.litesoc.io/docs/api/');
      expect(credentials.httpRequestNode.apiBaseUrlPlaceholder).toBe('https://api.litesoc.io/');
    });
  });

  describe('Properties', () => {
    it('should have apiKey property', () => {
      const apiKeyProp = credentials.properties.find(p => p.name === 'apiKey');
      expect(apiKeyProp).toBeDefined();
    });

    it('should have apiKey as required field', () => {
      const apiKeyProp = credentials.properties.find(p => p.name === 'apiKey');
      expect(apiKeyProp?.required).toBe(true);
    });

    it('should have apiKey as password type', () => {
      const apiKeyProp = credentials.properties.find(p => p.name === 'apiKey');
      expect(apiKeyProp?.type).toBe('string');
      expect(apiKeyProp?.typeOptions).toEqual({ password: true });
    });

    it('should have apiKey description with setup instructions', () => {
      const apiKeyProp = credentials.properties.find(p => p.name === 'apiKey');
      expect(apiKeyProp?.description).toContain('LiteSOC API key');
      expect(apiKeyProp?.description).toContain('Settings');
    });
  });

  describe('Authentication', () => {
    it('should use generic authentication type', () => {
      expect(credentials.authenticate.type).toBe('generic');
    });

    it('should add X-API-Key header for authentication', () => {
      expect(credentials.authenticate.properties.headers).toBeDefined();
      expect(credentials.authenticate.properties.headers).toHaveProperty('X-API-Key');
      expect(credentials.authenticate.properties.headers?.['X-API-Key']).toBe(
        '={{$credentials.apiKey}}'
      );
    });
  });

  describe('Credential Test', () => {
    it('should have test request configuration', () => {
      expect(credentials.test).toBeDefined();
      expect(credentials.test.request).toBeDefined();
    });

    it('should test against the health endpoint', () => {
      expect(credentials.test.request.url).toBe('/health');
    });

    it('should use correct base URL', () => {
      expect(credentials.test.request.baseURL).toBe('https://api.litesoc.io');
    });

    it('should use GET method for test', () => {
      expect(credentials.test.request.method).toBe('GET');
    });
  });
});
