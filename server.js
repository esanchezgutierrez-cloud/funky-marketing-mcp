import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || "v25.0";

async function metaGet(path, params = {}) {
  if (!META_ACCESS_TOKEN) {
    throw new Error("Falta la variable de entorno META_ACCESS_TOKEN en Render.");
  }

  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set("access_token", META_ACCESS_TOKEN);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

function asText(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "funky-marketing-mcp",
  version: "1.1.0",
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

server.tool(
  "get_ad_accounts",
  "Obtiene las cuentas publicitarias de Meta Ads disponibles para el usuario autorizado.",
  {},
  async () => {
    const data = await metaGet("me/adaccounts", {
      fields: "id,account_id,name,account_status,currency,timezone_name",
      limit: 100,
    });

    return asText(data);
  }
);

server.tool(
  "get_campaigns",
  "Obtiene campañas de una cuenta publicitaria de Meta Ads.",
  {
    ad_account_id: z
      .string()
      .describe("ID de cuenta publicitaria con formato act_XXXXXXXX."),
    status_filter: z
      .string()
      .optional()
      .describe("Filtro opcional: ACTIVE, PAUSED, DELETED, ARCHIVED."),
  },
  async ({ ad_account_id, status_filter }) => {
    const params = {
      fields:
        "id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,updated_time",
      limit: 100,
    };

    if (status_filter) {
      params.effective_status = JSON.stringify([status_filter]);
    }

    const data = await metaGet(`${ad_account_id}/campaigns`, params);
    return asText(data);
  }
);

server.tool(
  "get_campaign_insights",
  "Obtiene métricas de campañas de Meta Ads para una cuenta publicitaria y rango de fechas.",
  {
    ad_account_id: z
      .string()
      .describe("ID de cuenta publicitaria con formato act_XXXXXXXX."),
    since: z
      .string()
      .describe("Fecha inicial en formato YYYY-MM-DD."),
    until: z
      .string()
      .describe("Fecha final en formato YYYY-MM-DD."),
  },
  async ({ ad_account_id, since, until }) => {
    const data = await metaGet(`${ad_account_id}/insights`, {
      level: "campaign",
      fields:
        "campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,cost_per_action_type",
      time_range: JSON.stringify({ since, until }),
      limit: 100,
    });

    return asText(data);
  }
);

const transports = {};

app.get("/", (req, res) => {
  res.send("Funky Marketing MCP server is running.");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "funky-marketing-mcp",
    meta_api_version: META_API_VERSION,
    meta_token_configured: Boolean(META_ACCESS_TOKEN),
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
