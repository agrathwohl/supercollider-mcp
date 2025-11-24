# SuperCollider Client OSC Communication Patterns

## Critical Bug Fix - OSC Message Sending

### The Problem
Using `sendMsg()` with SuperCollider status queries returns `undefined` because it's a fire-and-forget method.

### The Solution
Use `callAndResponse()` which properly waits for OSC replies.

## Correct Implementation

**Import the msg helpers:**
```typescript
import * as msg from '@supercollider/server/lib/osc/msg.js';
```

**Query server status:**
```typescript
// WRONG - returns undefined (deprecated API)
const reply = await this.scServer.sendMsg('/status', []);

// RIGHT - returns status array
const reply = await this.scServer.callAndResponse(msg.status());
```

## How callAndResponse Works

1. Sends OSC message from `CallAndResponse.call`: `['/status']`
2. Waits for response matching `CallAndResponse.response`: `['/status.reply']`
3. Returns the payload from the response

## Status Reply Format

Array structure: `[unused, ugenCount, synthCount, groupCount, synthDefCount, avgCPU, peakCPU, sampleRateNominal, sampleRateActual]`

Destructure like:
```typescript
const [, ugenCount, synthCount, , , avgCPU, , sampleRate] = reply;
```

## Implementation Location
- **File**: `src/supercollider/client.ts:189`
- **Method**: `SuperColliderClient.getStatus()`

## Server Lifecycle Pattern
```typescript
// Boot
const server = await sc.server.boot({
  scsynth: '/path/to/scsynth',
  serverPort: '57110'
});

// Query
const status = await server.callAndResponse(msg.status());

// Shutdown
await server.quit();
```

## Test Verification
All operations confirmed working:
- ✅ Server boots on port 57110
- ✅ Status returns real metrics (CPU, sample rate, synth/ugen counts)
- ✅ Clean shutdown with SIGTERM
