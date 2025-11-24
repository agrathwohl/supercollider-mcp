import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createLogger } from '../src/utils/logger.js';

describe('Logger Utility', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('should create logger with default level info', () => {
    const logger = createLogger();

    logger.info('test message');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO ]'),
      'test message'
    );
  });

  test('should log error messages', () => {
    const logger = createLogger();

    logger.error('error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      'error message'
    );
  });

  test('should log warn messages', () => {
    const logger = createLogger();

    logger.warn('warning message');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN ]'),
      'warning message'
    );
  });

  test('should log debug messages when level is debug', () => {
    const logger = createLogger('debug');

    logger.debug('debug message');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      'debug message'
    );
  });

  test('should not log debug messages when level is info', () => {
    const logger = createLogger('info');

    logger.debug('debug message');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('should include timestamp in log output', () => {
    const logger = createLogger();

    logger.info('test');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      'test'
    );
  });

  test('should format error objects with stack traces', () => {
    const logger = createLogger();
    const error = new Error('test error');

    logger.error('error occurred', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      'error occurred',
      expect.objectContaining({
        message: 'test error',
        stack: expect.any(String)
      })
    );
  });

  test('should never use console.log', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger();

    logger.info('test');
    logger.error('test');
    logger.warn('test');
    logger.debug('test');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });
});
