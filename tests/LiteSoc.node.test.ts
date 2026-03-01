/**
 * Tests for LiteSoc Node
 * Covers node description validation and execution logic
 */

import { LiteSoc } from '../nodes/LiteSoc/LiteSoc.node';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

// Mock the GenericFunctions module
jest.mock('../nodes/LiteSoc/GenericFunctions', () => ({
  litesocApiRequest: jest.fn(),
  litesocApiRequestAllItems: jest.fn(),
  buildActor: jest.fn((id, email) => {
    if (!id && !email) return null;
    const actor: IDataObject = {};
    if (id) actor.id = id;
    if (email) actor.email = email;
    return actor;
  }),
  parseMetadata: jest.fn((items: Array<{ key: string; value: unknown }>) => {
    const metadata: IDataObject = {};
    for (const item of items) {
      if (item.key && item.value !== undefined) {
        metadata[item.key] = item.value;
      }
    }
    return metadata;
  }),
}));

// Import mocked functions
import { litesocApiRequest, litesocApiRequestAllItems } from '../nodes/LiteSoc/GenericFunctions';

const mockLitesocApiRequest = litesocApiRequest as jest.MockedFunction<typeof litesocApiRequest>;
const mockLitesocApiRequestAllItems = litesocApiRequestAllItems as jest.MockedFunction<typeof litesocApiRequestAllItems>;

describe('LiteSoc Node', () => {
  let node: LiteSoc;

  beforeEach(() => {
    node = new LiteSoc();
    jest.clearAllMocks();
  });

  describe('Node Description', () => {
    it('should have correct displayName', () => {
      expect(node.description.displayName).toBe('LiteSOC');
    });

    it('should have correct name', () => {
      expect(node.description.name).toBe('liteSoc');
    });

    it('should have correct version', () => {
      expect(node.description.version).toBe(1);
    });

    it('should have icon configured', () => {
      expect(node.description.icon).toBe('file:LiteSoc.svg');
    });

    it('should be usable as tool', () => {
      expect(node.description.usableAsTool).toBe(true);
    });

    it('should require liteSocApi credentials', () => {
      expect(node.description.credentials).toEqual([
        { name: 'liteSocApi', required: true },
      ]);
    });

    it('should have resource property with event and alert options', () => {
      const resourceProp = node.description.properties.find(p => p.name === 'resource');
      expect(resourceProp).toBeDefined();
      expect(resourceProp?.options).toContainEqual(
        expect.objectContaining({ name: 'Alert', value: 'alert' })
      );
      expect(resourceProp?.options).toContainEqual(
        expect.objectContaining({ name: 'Event', value: 'event' })
      );
    });

    it('should have Main input and output', () => {
      expect(node.description.inputs).toContain('main');
      expect(node.description.outputs).toContain('main');
    });
  });

  describe('Execute - Event Resource', () => {
    const createMockExecuteFunctions = (params: Record<string, unknown>): IExecuteFunctions => {
      const inputData: INodeExecutionData[] = [{ json: {} }];
      
      return {
        getInputData: () => inputData,
        getNodeParameter: jest.fn((name: string, index: number, fallback?: unknown) => {
          return params[name] ?? fallback;
        }),
        getNode: () => ({ name: 'LiteSOC' }),
        continueOnFail: () => false,
        helpers: {
          httpRequestWithAuthentication: jest.fn(),
          constructExecutionMetaData: jest.fn((data, options) => {
            return data.map((d: INodeExecutionData) => ({
              ...d,
              pairedItem: options.itemData,
            }));
          }),
          returnJsonArray: jest.fn((data) => {
            if (Array.isArray(data)) {
              return data.map(d => ({ json: d }));
            }
            return [{ json: data }];
          }),
        },
      } as unknown as IExecuteFunctions;
    };

    describe('event:create', () => {
      it('should create an event with required fields', async () => {
        const mockResponse = {
          id: 'evt_123',
          event: 'auth.login_failed',
          created_at: '2024-01-15T10:00:00Z',
        };
        mockLitesocApiRequest.mockResolvedValue(mockResponse);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'create',
          eventType: 'auth.login_failed',
          actorId: 'user_123',
          actorEmail: '',
          userIp: '',
          additionalFields: {},
          metadata: {},
        });

        const result = await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'POST',
          '/collect',
          expect.objectContaining({
            event: 'auth.login_failed',
            actor: { id: 'user_123' },
          })
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveLength(1);
      });

      it('should handle custom event type', async () => {
        mockLitesocApiRequest.mockResolvedValue({ id: 'evt_456' });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'create',
          eventType: 'custom',
          customEventType: 'billing.payment_failed',
          actorId: 'user_456',
          actorEmail: 'user@example.com',
          userIp: '192.168.1.1',
          additionalFields: {},
          metadata: {},
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'POST',
          '/collect',
          expect.objectContaining({
            event: 'billing.payment_failed',
            actor: { id: 'user_456', email: 'user@example.com' },
            user_ip: '192.168.1.1',
          })
        );
      });

      it('should throw error for invalid custom event type format', async () => {
        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'create',
          eventType: 'custom',
          customEventType: 'invalid_format',
          actorId: 'user_123',
          actorEmail: '',
          userIp: '',
          additionalFields: {},
          metadata: {},
        });

        await expect(node.execute.call(mockFunctions)).rejects.toThrow(
          'Custom event type must be in format category.action'
        );
      });

      it('should include metadata when provided', async () => {
        mockLitesocApiRequest.mockResolvedValue({ id: 'evt_789' });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'create',
          eventType: 'user.created',
          actorId: 'admin_001',
          actorEmail: '',
          userIp: '',
          additionalFields: {},
          metadata: {
            metadataValues: [
              { key: 'role', value: 'admin' },
              { key: 'department', value: 'engineering' },
            ],
          },
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'POST',
          '/collect',
          expect.objectContaining({
            metadata: { role: 'admin', department: 'engineering' },
          })
        );
      });

      it('should include timestamp when provided in additionalFields', async () => {
        mockLitesocApiRequest.mockResolvedValue({ id: 'evt_123' });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'create',
          eventType: 'auth.login',
          actorId: 'user_123',
          actorEmail: '',
          userIp: '',
          additionalFields: {
            timestamp: '2024-06-15T10:30:00Z',
          },
          metadata: {},
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'POST',
          '/collect',
          expect.objectContaining({
            timestamp: '2024-06-15T10:30:00Z',
          })
        );
      });
    });

    describe('event:get', () => {
      it('should get a single event by ID', async () => {
        const mockResponse = {
          id: '550e8400-e29b-41d4-a716-446655440001',
          event: 'auth.login',
          severity: 'info',
          trigger_event_id: '550e8400-e29b-41d4-a716-446655440002',
          forensics: {
            network: {
              is_vpn: false,
              is_tor: false,
              is_proxy: false,
              is_datacenter: false,
              asn: 'AS15169',
              threat_score: 0,
            },
            location: {
              city: 'Mountain View',
              country_code: 'US',
              region: 'California',
              latitude: 37.3861,
              longitude: -122.0839,
              timezone: 'America/Los_Angeles',
            },
          },
        };
        mockLitesocApiRequest.mockResolvedValue(mockResponse);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'get',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
        });

        const result = await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'GET',
          '/events/550e8400-e29b-41d4-a716-446655440001'
        );
        expect(result[0][0].json).toEqual(mockResponse);
        expect(result[0][0].json.trigger_event_id).toBe('550e8400-e29b-41d4-a716-446655440002');
        expect(result[0][0].json.forensics).toBeDefined();
      });

      it('should handle event with null forensics (Free tier)', async () => {
        const mockResponse = {
          id: '550e8400-e29b-41d4-a716-446655440003',
          event: 'auth.login',
          severity: 'info',
          trigger_event_id: null,
          forensics: null,
        };
        mockLitesocApiRequest.mockResolvedValue(mockResponse);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'get',
          eventId: '550e8400-e29b-41d4-a716-446655440003',
        });

        const result = await node.execute.call(mockFunctions);

        expect(result[0][0].json.forensics).toBeNull();
        expect(result[0][0].json.trigger_event_id).toBeNull();
      });
    });

    describe('event:getAll', () => {
      it('should get all events with returnAll=true', async () => {
        const mockEvents = [
          { id: 'evt_1', event: 'auth.login' },
          { id: 'evt_2', event: 'auth.logout' },
        ];
        mockLitesocApiRequestAllItems.mockResolvedValue(mockEvents);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'getAll',
          returnAll: true,
          filters: {},
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequestAllItems).toHaveBeenCalledWith(
          'GET',
          '/events',
          {},
          {}
        );
      });

      it('should apply filters when provided', async () => {
        mockLitesocApiRequest.mockResolvedValue({ data: [] });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'getAll',
          returnAll: false,
          limit: 10,
          filters: {
            eventType: 'auth.login',
            severity: 'high',
            actorId: 'user_123',
          },
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'GET',
          '/events',
          {},
          expect.objectContaining({
            event_name: 'auth.login',
            severity: 'high',
            actor_id: 'user_123',
            limit: 10,
          })
        );
      });

      it('should handle response with events array instead of data', async () => {
        const mockEvents = [{ id: 'evt_1' }, { id: 'evt_2' }];
        mockLitesocApiRequest.mockResolvedValue({ events: mockEvents });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'getAll',
          returnAll: false,
          limit: 10,
          filters: {},
        });

        const result = await node.execute.call(mockFunctions);

        expect(result[0]).toHaveLength(2);
      });

      it('should handle empty response without data or events', async () => {
        mockLitesocApiRequest.mockResolvedValue({});

        const mockFunctions = createMockExecuteFunctions({
          resource: 'event',
          operation: 'getAll',
          returnAll: false,
          limit: 10,
          filters: {},
        });

        const result = await node.execute.call(mockFunctions);

        expect(result[0]).toHaveLength(0);
      });

      // Note: Date filters (start_date, end_date) are not supported by the Events API
      // They are only supported by the Alerts API
    });
  });

  describe('Execute - Alert Resource', () => {
    const createMockExecuteFunctions = (params: Record<string, unknown>): IExecuteFunctions => {
      const inputData: INodeExecutionData[] = [{ json: {} }];
      
      return {
        getInputData: () => inputData,
        getNodeParameter: jest.fn((name: string, index: number, fallback?: unknown) => {
          return params[name] ?? fallback;
        }),
        getNode: () => ({ name: 'LiteSOC' }),
        continueOnFail: () => false,
        helpers: {
          httpRequestWithAuthentication: jest.fn(),
          constructExecutionMetaData: jest.fn((data, options) => {
            return data.map((d: INodeExecutionData) => ({
              ...d,
              pairedItem: options.itemData,
            }));
          }),
          returnJsonArray: jest.fn((data) => {
            if (Array.isArray(data)) {
              return data.map(d => ({ json: d }));
            }
            return [{ json: data }];
          }),
        },
      } as unknown as IExecuteFunctions;
    };

    describe('alert:get', () => {
      it('should get a single alert by ID', async () => {
        const mockResponse = {
          id: '550e8400-e29b-41d4-a716-446655440010',
          alert_type: 'brute_force',
          severity: 'high',
          status: 'open',
          trigger_event_id: '550e8400-e29b-41d4-a716-446655440011',
          forensics: {
            network: {
              is_vpn: true,
              is_tor: false,
              is_proxy: false,
              is_datacenter: true,
              asn: 'AS12345',
              threat_score: 75,
            },
            location: {
              city: 'Amsterdam',
              country_code: 'NL',
              region: 'North Holland',
              latitude: 52.3676,
              longitude: 4.9041,
              timezone: 'Europe/Amsterdam',
            },
          },
        };
        mockLitesocApiRequest.mockResolvedValue(mockResponse);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'get',
          alertId: '550e8400-e29b-41d4-a716-446655440010',
        });

        const result = await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'GET',
          '/alerts/550e8400-e29b-41d4-a716-446655440010'
        );
        expect(result[0][0].json).toEqual(mockResponse);
        expect(result[0][0].json.trigger_event_id).toBe('550e8400-e29b-41d4-a716-446655440011');
        expect(result[0][0].json.forensics).toBeDefined();
      });

      it('should handle alert with null forensics (Free tier)', async () => {
        const mockResponse = {
          id: '550e8400-e29b-41d4-a716-446655440012',
          alert_type: 'brute_force',
          severity: 'high',
          status: 'open',
          trigger_event_id: '550e8400-e29b-41d4-a716-446655440013',
          forensics: null,
        };
        mockLitesocApiRequest.mockResolvedValue(mockResponse);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'get',
          alertId: '550e8400-e29b-41d4-a716-446655440012',
        });

        const result = await node.execute.call(mockFunctions);

        expect(result[0][0].json.forensics).toBeNull();
        expect(result[0][0].json.trigger_event_id).toBe('550e8400-e29b-41d4-a716-446655440013');
      });
    });

    describe('alert:getAll', () => {
      it('should get all alerts with filters', async () => {
        mockLitesocApiRequest.mockResolvedValue({ data: [] });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'getAll',
          returnAll: false,
          limit: 25,
          filters: {
            severity: 'critical',
            status: 'open',
          },
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'GET',
          '/alerts/list',
          {},
          expect.objectContaining({
            severity: 'critical',
            status: 'open',
            limit: 25,
          })
        );
      });

      it('should return all alerts when returnAll is true', async () => {
        const mockAlerts = [
          { id: 'alt_1', severity: 'high' },
          { id: 'alt_2', severity: 'critical' },
        ];
        mockLitesocApiRequestAllItems.mockResolvedValue(mockAlerts);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'getAll',
          returnAll: true,
          filters: {},
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequestAllItems).toHaveBeenCalledWith(
          'GET',
          '/alerts/list',
          {},
          {}
        );
      });

      it('should apply all alert filters including dates', async () => {
        mockLitesocApiRequest.mockResolvedValue({ data: [] });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'getAll',
          returnAll: false,
          limit: 100,
          filters: {
            alertType: 'brute_force',
            severity: 'high',
            status: 'open',
            actorId: 'user_456',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-06-30T23:59:59Z',
          },
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'GET',
          '/alerts/list',
          {},
          expect.objectContaining({
            alert_type: 'brute_force',
            severity: 'high',
            status: 'open',
            actor_id: 'user_456',
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-06-30T23:59:59Z',
            limit: 100,
          })
        );
      });

      it('should handle response with alerts array instead of data', async () => {
        const mockAlerts = [{ id: 'alt_1' }, { id: 'alt_2' }];
        mockLitesocApiRequest.mockResolvedValue({ alerts: mockAlerts });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'getAll',
          returnAll: false,
          limit: 10,
          filters: {},
        });

        const result = await node.execute.call(mockFunctions);

        expect(result[0]).toHaveLength(2);
      });

      it('should handle empty response without data or alerts', async () => {
        mockLitesocApiRequest.mockResolvedValue({});

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'getAll',
          returnAll: false,
          limit: 10,
          filters: {},
        });

        const result = await node.execute.call(mockFunctions);

        expect(result[0]).toHaveLength(0);
      });
    });

    describe('alert:resolve', () => {
      it('should resolve an alert with resolution type', async () => {
        const mockResponse = {
          id: 'alt_123',
          status: 'resolved',
          resolution_type: 'fixed',
        };
        mockLitesocApiRequest.mockResolvedValue(mockResponse);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'resolve',
          alertId: 'alt_123',
          resolutionType: 'fixed',
          internalNotes: 'Issue was patched',
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'PATCH',
          '/alerts/alt_123',
          {
            action: 'resolve',
            resolution_type: 'fixed',
            internal_notes: 'Issue was patched',
          }
        );
      });

      it('should resolve without internal notes', async () => {
        mockLitesocApiRequest.mockResolvedValue({ id: 'alt_456', status: 'resolved' });

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'resolve',
          alertId: 'alt_456',
          resolutionType: 'mitigated',
          internalNotes: '',
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'PATCH',
          '/alerts/alt_456',
          {
            action: 'resolve',
            resolution_type: 'mitigated',
          }
        );
      });
    });

    describe('alert:markSafe', () => {
      it('should mark an alert as safe', async () => {
        const mockResponse = {
          id: 'alt_123',
          status: 'safe',
        };
        mockLitesocApiRequest.mockResolvedValue(mockResponse);

        const mockFunctions = createMockExecuteFunctions({
          resource: 'alert',
          operation: 'markSafe',
          alertId: 'alt_123',
          internalNotes: 'False positive - authorized user',
        });

        await node.execute.call(mockFunctions);

        expect(mockLitesocApiRequest).toHaveBeenCalledWith(
          'PATCH',
          '/alerts/alt_123',
          {
            action: 'mark_safe',
            internal_notes: 'False positive - authorized user',
          }
        );
      });
    });
  });

  describe('Error Handling', () => {
    const createMockExecuteFunctions = (
      params: Record<string, unknown>,
      continueOnFail = false
    ): IExecuteFunctions => {
      const inputData: INodeExecutionData[] = [{ json: {} }];
      
      return {
        getInputData: () => inputData,
        getNodeParameter: jest.fn((name: string, index: number, fallback?: unknown) => {
          return params[name] ?? fallback;
        }),
        getNode: () => ({ name: 'LiteSOC' }),
        continueOnFail: () => continueOnFail,
        helpers: {
          httpRequestWithAuthentication: jest.fn(),
          constructExecutionMetaData: jest.fn((data, options) => {
            return data.map((d: INodeExecutionData) => ({
              ...d,
              pairedItem: options.itemData,
            }));
          }),
          returnJsonArray: jest.fn((data) => {
            if (Array.isArray(data)) {
              return data.map(d => ({ json: d }));
            }
            return [{ json: data }];
          }),
        },
      } as unknown as IExecuteFunctions;
    };

    it('should throw error for unsupported operation', async () => {
      const mockFunctions = createMockExecuteFunctions({
        resource: 'event',
        operation: 'unsupported_op',
      });

      await expect(node.execute.call(mockFunctions)).rejects.toThrow(
        'Operation "unsupported_op" is not supported for event resource'
      );
    });

    it('should throw error for unsupported alert operation', async () => {
      const mockFunctions = createMockExecuteFunctions({
        resource: 'alert',
        operation: 'unsupported_alert_op',
      });

      await expect(node.execute.call(mockFunctions)).rejects.toThrow(
        'Operation "unsupported_alert_op" is not supported for alert resource'
      );
    });

    it('should throw error for unsupported resource', async () => {
      const mockFunctions = createMockExecuteFunctions({
        resource: 'unsupported_resource',
        operation: 'get',
      });

      await expect(node.execute.call(mockFunctions)).rejects.toThrow(
        'Resource "unsupported_resource" is not supported'
      );
    });

    it('should continue on fail when enabled', async () => {
      mockLitesocApiRequest.mockRejectedValue(new Error('API Error'));

      const mockFunctions = createMockExecuteFunctions(
        {
          resource: 'event',
          operation: 'get',
          eventId: 'evt_123',
        },
        true // continueOnFail = true
      );

      const result = await node.execute.call(mockFunctions);

      expect(result[0][0].json).toEqual({ error: 'API Error' });
    });

    it('should throw error when continueOnFail is false', async () => {
      mockLitesocApiRequest.mockRejectedValue(new Error('API Error'));

      const mockFunctions = createMockExecuteFunctions({
        resource: 'event',
        operation: 'get',
        eventId: 'evt_123',
      });

      await expect(node.execute.call(mockFunctions)).rejects.toThrow('API Error');
    });
  });
});
