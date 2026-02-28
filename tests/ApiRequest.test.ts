/**
 * Tests for LiteSOC API Request Functions
 * Covers litesocApiRequest and litesocApiRequestAllItems
 */

import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { litesocApiRequest, litesocApiRequestAllItems } from '../nodes/LiteSoc/GenericFunctions';

// Create mock for httpRequestWithAuthentication
const mockHttpRequestWithAuthentication = jest.fn();

// Create a mock execution context
const createMockContext = (): IExecuteFunctions => {
  return {
    getNode: () => ({ name: 'LiteSOC' }),
    helpers: {
      httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
    },
  } as unknown as IExecuteFunctions;
};

describe('litesocApiRequest', () => {
  let mockContext: IExecuteFunctions;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  describe('successful requests', () => {
    it('should make GET request with correct options', async () => {
      const mockResponse = { id: 'evt_123', event: 'auth.login' };
      mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

      const result = await litesocApiRequest.call(mockContext, 'GET', '/events/evt_123');

      expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
        'liteSocApi',
        expect.objectContaining({
          method: 'GET',
          url: 'https://api.litesoc.io/events/evt_123',
          json: true,
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('n8n-litesoc-node'),
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request with body', async () => {
      const mockResponse = { id: 'evt_456', event: 'auth.logout' };
      mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

      const body = { event: 'auth.logout', actor: { id: 'user_123' } };
      const result = await litesocApiRequest.call(mockContext, 'POST', '/collect', body);

      expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
        'liteSocApi',
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.litesoc.io/collect',
          body,
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include query string when provided', async () => {
      mockHttpRequestWithAuthentication.mockResolvedValue({ data: [] });

      const qs = { limit: 10, severity: 'high' };
      await litesocApiRequest.call(mockContext, 'GET', '/events', {}, qs);

      expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
        'liteSocApi',
        expect.objectContaining({
          qs: { limit: 10, severity: 'high' },
        })
      );
    });

    it('should not include body for GET requests', async () => {
      mockHttpRequestWithAuthentication.mockResolvedValue({});

      await litesocApiRequest.call(mockContext, 'GET', '/events');

      const calledOptions = mockHttpRequestWithAuthentication.mock.calls[0][1] as IHttpRequestOptions;
      expect(calledOptions.body).toBeUndefined();
    });

    it('should handle PATCH request', async () => {
      const mockResponse = { id: 'alt_123', status: 'resolved' };
      mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

      const body = { action: 'resolve', resolution_type: 'fixed' };
      await litesocApiRequest.call(mockContext, 'PATCH', '/alerts/alt_123', body);

      expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
        'liteSocApi',
        expect.objectContaining({
          method: 'PATCH',
          body,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle 401 Unauthorized error', async () => {
      const error = {
        statusCode: 401,
        message: 'Unauthorized',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Invalid API Key'
      );
    });

    it('should handle 403 Forbidden with PLAN_RESTRICTED code', async () => {
      const error = {
        cause: {
          code: 403,
          body: {
            error: {
              code: 'PLAN_RESTRICTED',
              message: 'This feature requires a Pro plan',
            },
          },
        },
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'POST', '/collect')).rejects.toThrow(
        'requires a Pro or Enterprise plan'
      );
    });

    it('should handle 429 Rate Limit with RATE_LIMIT_EXCEEDED code', async () => {
      const error = {
        cause: {
          code: 429,
          body: {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              retry_after: 30,
            },
          },
        },
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Rate limit exceeded. Please wait 30 seconds'
      );
    });

    it('should handle 404 Not Found error', async () => {
      const error = {
        statusCode: 404,
        message: 'Not found',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events/invalid')).rejects.toThrow(
        'Resource not found'
      );
    });

    it('should handle 400 Bad Request error with API message', async () => {
      const error = {
        statusCode: 400,
        message: 'Invalid event type format',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'POST', '/collect')).rejects.toThrow(
        'Invalid event type format'
      );
    });

    it('should handle 500 Server error', async () => {
      const error = {
        statusCode: 500,
        message: 'Internal server error',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'LiteSOC API is currently unavailable'
      );
    });

    it('should handle 503 Service Unavailable', async () => {
      const error = {
        statusCode: 503,
        message: 'Service unavailable',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'LiteSOC API is currently unavailable'
      );
    });

    it('should handle UNAUTHORIZED error code', async () => {
      const error = {
        cause: {
          body: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid API key',
            },
          },
        },
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Invalid API Key. Please check your LiteSOC credentials'
      );
    });

    it('should handle generic error without status code', async () => {
      const error = {
        message: 'Network error',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow();
    });

    it('should handle 502 Bad Gateway error', async () => {
      const error = {
        statusCode: 502,
        message: 'Bad gateway',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'LiteSOC API is currently unavailable'
      );
    });

    it('should handle 504 Gateway Timeout error', async () => {
      const error = {
        statusCode: 504,
        message: 'Gateway timeout',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'LiteSOC API is currently unavailable'
      );
    });

    it('should handle 429 status code without specific error code', async () => {
      const error = {
        statusCode: 429,
        message: 'Rate limit exceeded',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Rate Limit Exceeded. n8n is polling too fast'
      );
    });

    it('should handle 403 status code without specific error code', async () => {
      const error = {
        statusCode: 403,
        message: 'Forbidden',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Feature Restricted'
      );
    });

    it('should handle rate limit with default retry_after when not provided', async () => {
      const error = {
        cause: {
          code: 429,
          body: {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              // retry_after not provided - should default to 60
            },
          },
        },
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Rate limit exceeded. Please wait 60 seconds'
      );
    });

    it('should append API message when different from user message', async () => {
      const error = {
        statusCode: 404,
        message: 'Event evt_123 not found in database',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events/evt_123')).rejects.toThrow(
        'Details: Event evt_123 not found in database'
      );
    });

    it('should extract error message from response body', async () => {
      const error = {
        statusCode: 400,
        cause: {
          body: {
            error: {
              message: 'Invalid event type format: must contain a dot',
            },
          },
        },
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'POST', '/collect')).rejects.toThrow(
        'Invalid event type format: must contain a dot'
      );
    });

    it('should use err.description as fallback for apiMessage', async () => {
      const error = {
        statusCode: 400,
        description: 'Request validation failed',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'POST', '/collect')).rejects.toThrow(
        'Request validation failed'
      );
    });

    it('should handle error with httpCode property', async () => {
      const error = {
        httpCode: 401,
        message: 'Unauthorized access',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Invalid API Key'
      );
    });

    it('should handle error from response.body', async () => {
      const error = {
        statusCode: 403,
        response: {
          body: {
            error: {
              code: 'PLAN_RESTRICTED',
              message: 'Upgrade required',
            },
          },
        },
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'POST', '/collect')).rejects.toThrow(
        'requires a Pro or Enterprise plan'
      );
    });

    it('should not append details when apiMessage equals default message', async () => {
      const error = {
        statusCode: 500,
        message: 'LiteSOC API request failed',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      // Should throw with the service unavailable message, not appending the default message
      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'LiteSOC API is currently unavailable'
      );
    });

    it('should handle error with no errorCode in body', async () => {
      const error = {
        statusCode: 500,
        cause: {
          body: {
            error: {
              // no code field, only message
              message: 'Server error occurred',
            },
          },
        },
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'LiteSOC API is currently unavailable'
      );
    });

    it('should handle default case with unknown status code', async () => {
      const error = {
        statusCode: 418, // I'm a teapot - unusual status code
        message: 'Something unexpected happened',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'Something unexpected happened'
      );
    });

    it('should use default message in default case when no apiMessage', async () => {
      const error = {
        statusCode: 418,
        // No message
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'GET', '/events')).rejects.toThrow(
        'LiteSOC API request failed'
      );
    });

    it('should not append details when userMessage already includes apiMessage', async () => {
      const error = {
        statusCode: 400,
        message: 'Invalid request format',
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      // The userMessage will be 'Invalid request format' (from apiMessage)
      // Details should not be appended since userMessage already contains the apiMessage
      const thrownError = await litesocApiRequest.call(mockContext, 'POST', '/collect')
        .catch(e => e);
      
      expect(thrownError.message).toBe('Invalid request format');
      expect(thrownError.message).not.toContain('Details:');
    });

    it('should use default message for 400 error when no apiMessage', async () => {
      const error = {
        statusCode: 400,
        // no message at all
      };
      mockHttpRequestWithAuthentication.mockRejectedValue(error);

      await expect(litesocApiRequest.call(mockContext, 'POST', '/collect')).rejects.toThrow(
        'Invalid request. Please check the parameters.'
      );
    });
  });
});

describe('litesocApiRequestAllItems', () => {
  let mockContext: IExecuteFunctions;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  it('should fetch all items when total is less than page size', async () => {
    const mockResponse = {
      data: [
        { id: 'evt_1', event: 'auth.login' },
        { id: 'evt_2', event: 'auth.logout' },
      ],
      total: 2,
    };
    mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

    const result = await litesocApiRequestAllItems.call(mockContext, 'GET', '/events');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('evt_1');
  });

  it('should paginate and fetch all items across multiple pages', async () => {
    const page1Response = {
      data: Array(100).fill({ id: 'evt', event: 'auth.login' }),
      total: 150,
    };
    const page2Response = {
      data: Array(50).fill({ id: 'evt', event: 'auth.login' }),
      total: 150,
    };
    
    mockHttpRequestWithAuthentication
      .mockResolvedValueOnce(page1Response)
      .mockResolvedValueOnce(page2Response);

    const result = await litesocApiRequestAllItems.call(mockContext, 'GET', '/events');

    expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
  });

  it('should stop when limit is reached', async () => {
    const mockResponse = {
      data: Array(100).fill({ id: 'evt', event: 'auth.login' }),
      total: 500,
    };
    mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

    const result = await litesocApiRequestAllItems.call(mockContext, 'GET', '/events', {}, {}, 50);

    expect(result).toHaveLength(50);
  });

  it('should handle response with items instead of data', async () => {
    const mockResponse = {
      items: [
        { id: 'alt_1', type: 'brute_force' },
        { id: 'alt_2', type: 'suspicious_login' },
      ],
      total: 2,
    };
    mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

    const result = await litesocApiRequestAllItems.call(mockContext, 'GET', '/alerts/list');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('alt_1');
  });

  it('should include query string parameters', async () => {
    const mockResponse = { data: [], total: 0 };
    mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

    await litesocApiRequestAllItems.call(
      mockContext,
      'GET',
      '/events',
      {},
      { severity: 'critical' }
    );

    expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
      'liteSocApi',
      expect.objectContaining({
        qs: expect.objectContaining({
          severity: 'critical',
          page: 1,
          limit: 100,
        }),
      })
    );
  });

  it('should stop when returned items are less than page size', async () => {
    const mockResponse = {
      data: [{ id: 'evt_1' }],
      total: 0, // total is not reliable, so check items length
    };
    mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

    const result = await litesocApiRequestAllItems.call(mockContext, 'GET', '/events');

    expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('should handle empty response', async () => {
    const mockResponse = { data: [], total: 0 };
    mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

    const result = await litesocApiRequestAllItems.call(mockContext, 'GET', '/events');

    expect(result).toHaveLength(0);
  });

  it('should handle response without data or items array', async () => {
    const mockResponse = { total: 0 };
    mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

    const result = await litesocApiRequestAllItems.call(mockContext, 'GET', '/events');

    expect(result).toHaveLength(0);
  });
});
