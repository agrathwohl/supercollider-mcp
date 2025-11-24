import { SuperColliderClient } from "./dist/index.js";

const client = new SuperColliderClient();

// Boot SuperCollider server
await client.connect();

// Get server status
const status = await client.getStatus();
console.log(status);
// { port: 57110, status: 'running', cpuUsage: 12.5, synthCount: 5, ... }

// Disconnect
await client.disconnect();
