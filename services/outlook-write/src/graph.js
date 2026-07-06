// Microsoft Graph client — app-only (client-credentials). The connector holds
// its own Azure app-registration secret and drafts into a configured mailbox.
// Delegated / On-Behalf-Of (draft "as whoever is connected") is the enterprise
// upgrade path; app-only keeps the demo to one Azure app and zero per-user OAuth.
//
// Env:
//   AZURE_TENANT_ID       the Entra tenant (GUID or *.onmicrosoft.com)
//   AZURE_CLIENT_ID       the app registration's client id
//   AZURE_CLIENT_SECRET   its client secret (Secret Manager -> Cloud Run env)
//   OUTLOOK_MAILBOX       UPN of the mailbox to draft into (app access policy
//                         should scope the app to exactly this mailbox)

const TENANT = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const MAILBOX = process.env.OUTLOOK_MAILBOX;
const GRAPH = "https://graph.microsoft.com/v1.0";

export function graphConfigured() {
  return Boolean(TENANT && CLIENT_ID && CLIENT_SECRET && MAILBOX);
}

let cached = { token: "", exp: 0 };

async function appToken() {
  const now = Date.now();
  if (cached.token && now < cached.exp - 60_000) return cached.token;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body },
  );
  if (!res.ok) {
    throw new Error(`Azure token endpoint ${res.status}: ${await safeText(res)}`);
  }
  const j = await res.json();
  cached = { token: j.access_token, exp: now + j.expires_in * 1000 };
  return cached.token;
}

async function safeText(res) {
  try { return (await res.text()).slice(0, 300); } catch { return ""; }
}

async function graph(method, path, jsonBody) {
  const token = await appToken();
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(jsonBody ? { "content-type": "application/json" } : {}),
    },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
  });
  if (!res.ok) throw new Error(`Graph ${method} ${path} -> ${res.status}: ${await safeText(res)}`);
  return res.status === 204 ? null : res.json();
}

const mbox = () => `/users/${encodeURIComponent(MAILBOX)}`;

/**
 * Create a reply DRAFT to an existing message and set its body. Leaves it in the
 * mailbox's Drafts folder for a human to review and Send — the connector never
 * sends. Returns { id, webLink }.
 */
export async function createReplyDraft(messageId, bodyText) {
  // POST .../messages/{id}/createReply returns a draft Message (reply scaffold).
  const draft = await graph("POST", `${mbox()}/messages/${messageId}/createReply`, {});
  // Set the body. HTML so newlines render; we escape the text and use <br>.
  const html = escapeHtml(bodyText).replace(/\n/g, "<br>");
  await graph("PATCH", `${mbox()}/messages/${draft.id}`, {
    body: { contentType: "HTML", content: html },
  });
  return { id: draft.id, webLink: draft.webLink };
}

/** Create a brand-new draft (not a reply). Returns { id, webLink }. */
export async function createDraft({ to, subject, bodyText }) {
  const html = escapeHtml(bodyText).replace(/\n/g, "<br>");
  const draft = await graph("POST", `${mbox()}/messages`, {
    subject,
    body: { contentType: "HTML", content: html },
    toRecipients: (Array.isArray(to) ? to : [to]).map((address) => ({
      emailAddress: { address },
    })),
  });
  return { id: draft.id, webLink: draft.webLink };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
