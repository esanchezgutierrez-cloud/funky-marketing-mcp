import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

const server = new McpServer({
  name: "funky-marketing-mcp",
  version: "1.0.0",
});

server.tool(
  "ping_funky_mcp",
  "Comprueba que el servidor MCP de Funky Marketing está funcionando.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "Funky Marketing MCP funciona correctamente.",
        },
      ],
    };
  }
);

app.get("/", (req, res) => {
  res.send("Funky Marketing MCP server is running.");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "funky-marketing-mcp",
  });
});

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
