/**
 * Tests for GenericFunctions
 * Covers API request helpers, metadata parsing, actor building, and validation
 */

import {
  formatEventType,
  validateSeverity,
  buildActor,
  parseMetadata,
} from '../nodes/LiteSoc/GenericFunctions';

describe('GenericFunctions', () => {
  describe('formatEventType', () => {
    it('should accept valid event type with category.action format', () => {
      expect(formatEventType('auth.login_failed')).toBe('auth.login_failed');
      expect(formatEventType('user.created')).toBe('user.created');
      expect(formatEventType('document.accessed')).toBe('document.accessed');
    });

    it('should normalize to lowercase and trim', () => {
      expect(formatEventType('Auth.Login_Failed')).toBe('auth.login_failed');
      expect(formatEventType('  USER.CREATED  ')).toBe('user.created');
    });

    it('should throw error for event type without dot separator', () => {
      expect(() => formatEventType('login_failed')).toThrow(
        'Event type must be in format: category.action'
      );
      expect(() => formatEventType('auth')).toThrow(
        'Event type must be in format: category.action'
      );
    });

    it('should handle event types with multiple dots', () => {
      expect(formatEventType('auth.oauth.login')).toBe('auth.oauth.login');
    });
  });

  describe('validateSeverity', () => {
    it('should accept valid severity levels', () => {
      expect(validateSeverity('low')).toBe('low');
      expect(validateSeverity('medium')).toBe('medium');
      expect(validateSeverity('high')).toBe('high');
      expect(validateSeverity('critical')).toBe('critical');
    });

    it('should normalize to lowercase and trim', () => {
      expect(validateSeverity('LOW')).toBe('low');
      expect(validateSeverity('  HIGH  ')).toBe('high');
      expect(validateSeverity('Medium')).toBe('medium');
    });

    it('should throw error for invalid severity', () => {
      expect(() => validateSeverity('urgent')).toThrow(
        'Invalid severity. Must be one of: low, medium, high, critical'
      );
      expect(() => validateSeverity('extreme')).toThrow(
        'Invalid severity. Must be one of: low, medium, high, critical'
      );
      expect(() => validateSeverity('')).toThrow(
        'Invalid severity. Must be one of: low, medium, high, critical'
      );
    });
  });

  describe('buildActor', () => {
    it('should return null when no parameters provided', () => {
      expect(buildActor()).toBeNull();
      expect(buildActor(undefined, undefined)).toBeNull();
    });

    it('should build actor with only id', () => {
      const result = buildActor('user_123');
      expect(result).toEqual({ id: 'user_123' });
    });

    it('should build actor with only email', () => {
      const result = buildActor(undefined, 'user@example.com');
      expect(result).toEqual({ email: 'user@example.com' });
    });

    it('should build actor with both id and email', () => {
      const result = buildActor('user_123', 'user@example.com');
      expect(result).toEqual({
        id: 'user_123',
        email: 'user@example.com',
      });
    });

    it('should handle empty strings', () => {
      // Empty string is falsy, so should return null
      expect(buildActor('')).toBeNull();
      expect(buildActor('', '')).toBeNull();
    });
  });

  describe('parseMetadata', () => {
    it('should parse key-value pairs into object', () => {
      const items = [
        { key: 'ip_address', value: '192.168.1.1' },
        { key: 'user_agent', value: 'Mozilla/5.0' },
      ];
      const result = parseMetadata(items);
      expect(result).toEqual({
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      });
    });

    it('should return empty object for empty array', () => {
      expect(parseMetadata([])).toEqual({});
    });

    it('should skip items without key', () => {
      const items = [
        { key: 'valid', value: 'value' },
        { value: 'orphan_value' },
        { key: 'another', value: 'item' },
      ] as Array<{ key?: string; value?: string }>;
      // Cast to any to test edge case behavior
      const result = parseMetadata(items as any);
      expect(result).toEqual({
        valid: 'value',
        another: 'item',
      });
    });

    it('should include items with undefined value but not skip them', () => {
      const items = [
        { key: 'hasValue', value: 'test' },
        { key: 'nullValue', value: null },
        { key: 'zeroValue', value: 0 },
        { key: 'falseValue', value: false },
      ];
      const result = parseMetadata(items);
      expect(result).toEqual({
        hasValue: 'test',
        nullValue: null,
        zeroValue: 0,
        falseValue: false,
      });
    });

    it('should handle nested objects as values', () => {
      const items = [
        { key: 'nested', value: { deep: { value: 123 } } },
        { key: 'array', value: [1, 2, 3] },
      ];
      const result = parseMetadata(items);
      expect(result).toEqual({
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
      });
    });
  });
});
