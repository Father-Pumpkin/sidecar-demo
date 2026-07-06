// outlook-write — a custom remote MCP connector that ADDS the drafting
// capability the official Microsoft 365 connector deliberately omits (it's
// read-only). Same backend (Microsoft Graph), the write half.
//
// Two independent auth legs, both simple:
//   1. Claude  -> this server : a STATIC BEARER token (OUTLOOK_WRITE_TOKEN).
//      Add the connector with:  claude mcp add --transport http outlook-write \
//        <url>/mcp --header "Authorization: Bearer <token>"
//   2. this server -> Graph : app-only client credentials (see graph.js).
//
// It DRAFTS only — every tool leaves the message in the mailbox's Drafts folder
// for a human to review and Send. The connector has no send tool by design.
import express from "express";
import { timingSafeEqual } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createReplyDraft, createDraft, graphConfigured } from "./graph.js";

function req(args, key) {
  const v = args[key];
  if (typeof v !== "string" || !v.trim()) throw new Error(`Missing required "${key}".`);
  return v;
}

const TOOLS = [
  {
    name: "create_reply_draft",
    description:
      "Draft a reply to an existing Outlook message and leave it in the Drafts " +
      "folder for the user to review and send. Does NOT send. Use the message id " +
      "from the official Microsoft 365 connector's email search. Returns the " +
      "draft's webLink so the user can open it in Outlook.",
    inputSchema: {
      type: "object",
      properties: {
        message_id: { type: "string", description: "Id of the message to reply to (from the M365 connector)." },
        body: { type: "string", description: "The reply text. Plain text; newlines are preserved." },
      },
      required: ["message_id", "body"],
    },
    run: async (a) => {
      const { webLink } = await createReplyDraft(req(a, "message_id"), req(a, "body"));
      return `Reply draft created in Drafts. Review and send it here: ${webLink}`;
    },
  },
  {
    name: "create_draft",
    description:
      "Draft a new Outlook email (not a reply) and leave it in Drafts for the " +
      "user to review and send. Does NOT send. Returns the draft's webLink.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address." },
        subject: { type: "string", description: "Subject line." },
        body: { type: "string", description: "Body text. Plain text; newlines preserved." },
      },
      required: ["to", "subject", "body"],
    },
    run: async (a) => {
      const { webLink } = await createDraft({ to: req(a, "to"), subject: req(a, "subject"), bodyText: req(a, "body") });
      return `Draft created in Drafts. Review and send it here: ${webLink}`;
    },
  },
];

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

function makeServer() {
  const server = new Server(
    { name: "outlook-write", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (r) => {
    const tool = TOOL_MAP.get(r.params.name);
    if (!tool) return { content: [{ type: "text", text: `Unknown tool: ${r.params.name}` }], isError: true };
    try {
      const text = await tool.run(r.params.arguments ?? {});
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  });
  return server;
}

const app = express();
app.use(express.json({ limit: "1mb" }));

// --- Claude -> server auth: static bearer, constant-time compare -----------
const TOKEN = process.env.OUTLOOK_WRITE_TOKEN || "";
function authed(reqHeader) {
  const m = /^Bearer (.+)$/i.exec(reqHeader || "");
  if (!m || !TOKEN) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.post("/mcp", async (req2, res) => {
  if (!authed(req2.headers.authorization)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const server = makeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { void transport.close(); void server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req2, res, req2.body);
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
    }
  }
});

const notAllowed = (_req, res) =>
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
app.get("/mcp", notAllowed);
app.delete("/mcp", notAllowed);

app.get("/healthz", (_req, res) =>
  res.status(200).json({ ok: true, graphConfigured: graphConfigured(), authConfigured: Boolean(TOKEN) }),
);

const PORT = Number(process.env.PORT ?? 8080);
app.listen(PORT, () => console.log(`outlook-write on :${PORT}`));
