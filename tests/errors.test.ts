import { describe, test, expect } from '@jest/globals';
import { SuperColliderError } from '../src/utils/errors.js';

describe('SuperColliderError', () => {
  test('should create SuperColliderError with message and code', () => {
    const error = new SuperColliderError(
      'SuperCollider not found',
      'SC_NOT_FOUND'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SuperColliderError);
    expect(error.message).toBe('SuperCollider not found');
    expect(error.code).toBe('SC_NOT_FOUND');
    expect(error.name).toBe('SuperColliderError');
  });

  test('should include original error if provided', () => {
    const originalError = new Error('Connection refused');
    const error = new SuperColliderError(
      'Failed to connect',
      'SC_CONNECTION_FAILED',
      originalError
    );

    expect(error.originalError).toBe(originalError);
    expect(error.originalError?.message).toBe('Connection refused');
  });

  test('should work without original error', () => {
    const error = new SuperColliderError(
      'Timeout occurred',
      'SC_TIMEOUT'
    );

    expect(error.originalError).toBeUndefined();
  });
});

describe('Error codes', () => {
  test('should have SC_NOT_FOUND error code constant', async () => {
    const { SC_NOT_FOUND } = await import('../src/utils/errors.js');
    expect(SC_NOT_FOUND).toBe('SC_NOT_FOUND');
  });

  test('should have SC_TIMEOUT error code constant', async () => {
    const { SC_TIMEOUT } = await import('../src/utils/errors.js');
    expect(SC_TIMEOUT).toBe('SC_TIMEOUT');
  });

  test('should have SC_CONNECTION_FAILED error code constant', async () => {
    const { SC_CONNECTION_FAILED } = await import('../src/utils/errors.js');
    expect(SC_CONNECTION_FAILED).toBe('SC_CONNECTION_FAILED');
  });

  test('should have SC_INVALID_RESPONSE error code constant', async () => {
    const { SC_INVALID_RESPONSE } = await import('../src/utils/errors.js');
    expect(SC_INVALID_RESPONSE).toBe('SC_INVALID_RESPONSE');
  });
});
