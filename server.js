import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

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
  async () => ({
    content: [
      {
        type: "text",
        text: "Funky Marketing MCP funciona correctamente.",
      },
    ],
  })
);

const transports = {};

app.get("/", (req, res) => {
  res.send("Funky Marketing MCP server is running.");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "funky-marketing-mcp",
  });
});

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];

  if (!transport) {
    res.status(400).send("No transport found for sessionId");
    return;
  }

  await transport.handlePostMessage(req, res, req.body);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
