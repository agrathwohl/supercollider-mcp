# SuperCollider MCP Server

Model Context Protocol (MCP) server for SuperCollider integration with Claude Code and other MCP clients.

## Features

- **Server Discovery**: Automatically discovers running SuperCollider servers on common ports (57110, 57120)
- **Server Management**: Boot and manage SuperCollider (scsynth) server processes
- **Status Queries**: Query server status including CPU usage, synth count, and sample rate
- **MCP Tools**: Provides `get_server_status` tool for Claude Code integration

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server (Claude Code Integration)

Add to your Claude Code MCP configuration (`~/.config/claude/mcp.json` or similar):

```json
{
  "mcpServers": {
    "supercollider": {
      "command": "node",
      "args": ["/path/to/supercollider-mcp/dist/index.js"]
    }
  }
}
```

### Programmatic Usage

```typescript
import { SuperColliderClient } from 'supercollider-mcp';

const client = new SuperColliderClient();

// Boot SuperCollider server
await client.connect();

// Get server status
const status = await client.getStatus();
console.log(status);
// { port: 57110, status: 'running', cpuUsage: 12.5, synthCount: 5, ... }

// Disconnect
await client.disconnect();
```

## MCP Tools

### get_server_status

Query the status of the running SuperCollider server.

**Parameters**: None

**Returns**:
```json
{
  "port": 57110,
  "status": "running",
  "ugenCount": 10,
  "synthCount": 5,
  "cpuUsage": 12.5,
  "sampleRate": 48000
}
```

## Development

```bash
# Run tests
npm test

# Build
npm run build

# Run in development
npm run dev
```

## Architecture

- **Discovery Service**: TCP port scanning to find running SC servers
- **Client**: Manages connection lifecycle and OSC communication via supercolliderjs
- **MCP Server**: stdio transport for Claude Code integration
- **Tools**: MCP tool handlers for server status queries

## Requirements

- Node.js >= 18
- SuperCollider (scsynth) installed on system
- Optional: Running SuperCollider server for discovery mode

## License

MIT
