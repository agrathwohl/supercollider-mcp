#!/usr/bin/env node

/**
 * SuperCollider MCP Server
 * Model Context Protocol server for SuperCollider integration
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { SuperColliderClient } from "./supercollider/client.js";
import { getServerStatusHandler } from "./tools/getServerStatus.js";
import { logger } from "./utils/logger.js";

/**
 * MCP server instance
 */
const server = new Server(
  {
    name: "supercollider-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

/**
 * SuperCollider client instance
 * scsynth path will be auto-detected by supercolliderjs
 */
const scClient = new SuperColliderClient();

/**
 * Tool schema for get_server_status
 */
const GetServerStatusSchema = z.object({});

/**
 * Register MCP tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_server_status",
        description: "Query status of running SuperCollider server",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_server_status": {
      GetServerStatusSchema.parse(args);
      return await getServerStatusHandler(scClient);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Main entry point
 */
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("SuperCollider MCP server started");
  } catch (error) {
    logger.error("Fatal error during server startup:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
process.on("SIGINT", async () => {
  logger.info("Shutting down SuperCollider MCP server...");

  try {
    if (scClient.getConnectionState() === "connected") {
      await scClient.disconnect();
    }
  } catch (error) {
    logger.error("Error during shutdown:", error);
  }

  process.exit(0);
});

/**
 * Unhandled rejection handler
 */
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection:", error);
  process.exit(1);
});

// Start the server
main();
