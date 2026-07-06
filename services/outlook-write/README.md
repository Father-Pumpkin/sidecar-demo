# outlook-write — a custom connector that extends the official Outlook connector

The official Microsoft 365 connector is **read-only**. This is a small hosted MCP
server that adds the **write half** — drafting — using the same backend
(Microsoft Graph). It **drafts only**: every tool leaves the message in the
mailbox's **Drafts** folder for a human to review and Send. There is no send tool
by design (the human on the Send button is the governance boundary).

Two independent, simple auth legs:
- **Claude → this server:** a static bearer token (`OUTLOOK_WRITE_TOKEN`).
- **This server → Graph:** app-only client credentials (one Azure app registration).

Tools: `create_reply_draft(message_id, body)` · `create_draft(to, subject, body)`.

---

## 1. Azure app registration (Entra) — the one new piece

In the [Entra admin center](https://entra.microsoft.com) (you're admin of the
`boldtechdevelopment` tenant):

1. **App registrations → New registration.** Name `outlook-write-connector`,
   single tenant, no redirect URI (app-only). Note the **Application (client) ID**
   and **Directory (tenant) ID**.
2. **Certificates & secrets → New client secret.** Copy the **Value** (shown
   once).
3. **API permissions → Add → Microsoft Graph → Application permissions →
   `Mail.ReadWrite`** → Add. Then **Grant admin consent** (the button; you have
   the rights). App-only `Mail.ReadWrite` covers create-draft; no `Mail.Send`
   needed since we never send.
4. **(Recommended) Scope the app to ONE mailbox** so it can't touch every
   mailbox in the tenant. In Exchange Online PowerShell:
   ```powershell
   Connect-ExchangeOnline
   # a mail-enabled security group containing only the dev mailbox:
   New-DistributionGroup -Name "outlook-write-scope" -Type Security \
     -Members developer@boldtechdevelopment.onmicrosoft.com
   New-ApplicationAccessPolicy -AppId <client-id> \
     -PolicyScopeGroupId outlook-write-scope@boldtechdevelopment.onmicrosoft.com \
     -AccessRight RestrictAccess -Description "outlook-write: dev mailbox only"
   ```
   Skip only for a throwaway solo tenant; do it for anything real.

## 2. Deploy (Cloud Run)

Store the two secrets without echoing them, then deploy (values you never paste
into a terminal history — generate/store via stdin):

```bash
# static bearer for Claude -> server (generate + store)
openssl rand -base64 32 | tr -d '\n' | gcloud secrets create outlook-write-token --data-file=-
# the Azure client secret (paste when prompted, or --data-file a temp file)
gcloud secrets create azure-client-secret --data-file=-   # then type/paste, Ctrl-D

gcloud run deploy outlook-write --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars AZURE_TENANT_ID=<tenant-id>,AZURE_CLIENT_ID=<client-id>,OUTLOOK_MAILBOX=developer@boldtechdevelopment.onmicrosoft.com \
  --set-secrets AZURE_CLIENT_SECRET=azure-client-secret:latest,OUTLOOK_WRITE_TOKEN=outlook-write-token:latest
```

`GET /healthz` should then report `{"ok":true,"graphConfigured":true,"authConfigured":true}`.

## 3. Add the connector to Claude

```bash
claude mcp add --transport http outlook-write <service-url>/mcp \
  --header "Authorization: Bearer $(gcloud secrets versions access latest --secret=outlook-write-token)"
```

(Reads the token straight from Secret Manager so it never lands in shell history.)

## 4. It composes with the official connector

Once connected, `workorder-smith:intake` drafts the confirmation reply straight
into Outlook Drafts instead of handing you paste-ready text — the official M365
connector *reads* the request, this connector *drafts* the reply. If
`outlook-write` isn't connected, the skill falls back to paste-ready text (never
blocks).

## Upgrade path (enterprise)

App-only drafts into one fixed mailbox. To draft **as whoever is connected**
across a client's tenant, swap to **delegated + On-Behalf-Of**: Claude signs into
the client's Entra tenant, this server exchanges that token (OBO) for a Graph
token with the user's delegated `Mail.ReadWrite`. That's the runbook §9
enterprise-tier pattern; prototype Claude's MCP-OAuth-against-Entra first (Entra
doesn't honor RFC 8707 resource indicators).
