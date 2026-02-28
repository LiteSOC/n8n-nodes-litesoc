/**
 * Mock for n8n-core module
 * Provides minimal implementations for testing
 */

export const BINARY_ENCODING = 'base64';

export const createDeferredPromise = <T = void>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
};
