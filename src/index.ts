#!/usr/bin/env node
/**
 * MCP server exposing Google Tasks as tools: create_tasklist, list_tasklists,
 * add_task, list_tasks. Runs over stdio for local use only.
 */

import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTasklistTools } from "./tools/tasklists.js";
import { registerTaskTools } from "./tools/tasks.js";

// Registered globally, this server can be launched from any working directory,
// so resolve .env relative to this file (project root) instead of process.cwd().
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: path.join(projectRoot, ".env") });

if (!process.env.GOOGLE_ACCESS_TOKEN) {
  console.error(
    "ERROR: GOOGLE_ACCESS_TOKEN environment variable is required.\n" +
      "Get one from https://developers.google.com/oauthplayground with the " +
      "https://www.googleapis.com/auth/tasks scope, then put it in a .env file " +
      "(see .env.example) — never commit it.",
  );
  process.exit(1);
}

const server = new McpServer({
  name: "google-tasks-mcp-server",
  version: "1.0.0",
});

registerTasklistTools(server);
registerTaskTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Tasks MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
