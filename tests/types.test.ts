import { describe, test, expect } from '@jest/globals';
import type { SuperColliderStatus, ConnectionState, OSCStatusReply } from '../src/supercollider/types.js';

describe('SuperColliderStatus interface', () => {
  test('should define valid SuperCollider status structure', () => {
    const status: SuperColliderStatus = {
      port: 57110,
      status: 'running',
      version: '3.13.0',
      ugenCount: 100,
      synthCount: 5,
      cpuUsage: 12.5,
      sampleRate: 48000,
    };

    // Required fields
    expect(status.port).toBeDefined();
    expect(status.status).toBeDefined();
    expect(['running', 'disconnected', 'error']).toContain(status.status);

    // Optional fields
    expect(status.version).toBeDefined();
    expect(status.ugenCount).toBeDefined();
    expect(status.synthCount).toBeDefined();
    expect(status.cpuUsage).toBeDefined();
    expect(status.sampleRate).toBeDefined();
  });

  test('should allow minimal SuperColliderStatus with only required fields', () => {
    const minimalStatus: SuperColliderStatus = {
      port: 57110,
      status: 'disconnected',
    };

    expect(minimalStatus.port).toBe(57110);
    expect(minimalStatus.status).toBe('disconnected');
  });
});

describe('ConnectionState type', () => {
  test('should define valid connection state values', () => {
    const states: ConnectionState[] = ['disconnected', 'connecting', 'connected', 'error'];

    states.forEach(state => {
      const validState: ConnectionState = state;
      expect(validState).toBeDefined();
    });
  });
});

describe('OSCStatusReply interface', () => {
  test('should parse OSC /status.reply with 8 arguments', () => {
    const oscReply: OSCStatusReply = {
      unused: 0,
      ugenCount: 100,
      synthCount: 5,
      groupCount: 3,
      synthDefCount: 20,
      avgCPU: 10.5,
      peakCPU: 15.2,
      nominalSampleRate: 44100,
      actualSampleRate: 44100,
    };

    expect(oscReply.ugenCount).toBe(100);
    expect(oscReply.synthCount).toBe(5);
    expect(oscReply.avgCPU).toBeGreaterThan(0);
    expect(oscReply.nominalSampleRate).toBe(44100);
  });
});
