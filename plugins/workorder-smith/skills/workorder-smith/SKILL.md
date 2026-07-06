---
name: workorder-smith
description: Author work-order tickets in the exact contract format the AcmeOps sidecar extension parses and fills into the API-less AcmeOps work-order UI. Also handles email intake — turning work-request emails (official Outlook/Microsoft 365 connector) into tickets and sending the requester a confirmation once placed. Use when the user wants to draft, write, or revise a work order / maintenance ticket, or process work requests from their inbox.
allowed-tools: [Read, Write, Glob]
---

# Workorder Smith

Writes work-order tickets that the **AcmeOps sidecar** (this repo's browser
extension) can parse and place into the AcmeOps UI with one click. AcmeOps has
no API — the ticket text IS the integration surface, so the format is a
contract, not a suggestion.

## The contract

Read `${CLAUDE_PLUGIN_ROOT}/skills/workorder-smith/references/ticket-contract.md`
**before writing your first ticket**. The three things people trip on:

1. The first line is `WO-<number>: <title>` — the sidecar keys on that prefix.
2. The meta line is pipe-separated: `Priority X | Department Y | Status Z`,
   and each value must be one the AcmeOps dropdowns actually contain.
3. Parts and Steps are sections started by a lone `Parts` / `Steps` line; each
   row is `Name. <rest>` — the period after the name is the delimiter.

## Workflow

1. Draft the ticket from the user's request. Choose realistic parts (with
   quantities and unit costs) and stepwise instructions a tech could follow.
2. Validate against the contract's hard requirements — every field you emit
   should survive the parser (the contract lists the failure modes).
3. Save to `tickets/<WO-number>.txt` in the current project and show the full
   ticket. The user pastes it into the sidecar's manual box, or publishes it to
   the shared ticket source (`app/public/tickets.json` in this repo) so it
   appears in the sidecar's pick-list.

## Email intake — orchestrating the official Outlook connector

Work requests usually start life as email. When the user has the **official
Microsoft 365 / Outlook connector** connected, run the full loop:

1. **Find the request(s).** Use the connector's mail search/read tools to pull
   the email(s) the user described (by sender, subject keywords, or the most
   recent unread request-like messages). Quote the request back briefly so the
   user confirms you grabbed the right one.
2. **Draft the ticket from the email.** Map what the email gives you: what's
   broken and where → Title and Steps; stated urgency ("line is down") →
   Priority; the affected area/team → Department. Infer sensible parts and
   steps as usual; the email is a *request*, not a spec.
3. **Hand off to the sidecar** (pick-list or paste → Fill) and wait for the
   user to confirm the order is saved in AcmeOps.
4. **Close the loop.** Compose the reply — WO number, priority, one-line plan.
   How you deliver it depends on which connectors are present:
   - **If the custom `outlook-write` connector is connected**, call
     `create_reply_draft(message_id=<the email's id>, body=<the reply>)`. It
     writes the reply into the user's Outlook **Drafts** and returns a `webLink`;
     hand the user that link to review and Send. The official M365 connector
     *read* the request; this custom connector *drafts* the reply — the write
     capability the official one omits.
   - **Otherwise** (M365 connector is read-only on its own), present the reply as
     paste-ready text with the email's `webLink` so the user opens the thread and
     pastes it. Never block; this fallback always works.
   Either way, **a human clicks Send** — no connector here sends autonomously.
   That governance boundary is a feature to name, not a gap to apologize for.

Three rules that make this pattern portable to any official connector:

- **Verify the capability surface; don't assume it.** Load the connector's
  actual tool schemas before promising a step — this connector exposes
  search/read/calendar/SharePoint tools and nothing that sends. Design the
  workflow around what's really there.
- **Reference capabilities, not hard-coded tool names.** Official connector
  tool names can change between versions — describe the capability (search
  mail, read message) and let the connector's schemas supply the tools.
- **Graceful degradation is mandatory.** Plugins cannot bundle or install an
  official connector — it's account-level, connected once by the user (or
  pushed org-wide by an admin). If it isn't connected, say so once and fall
  back to asking for the email text pasted in. Never block on it.

This is the demonstrable point for a business audience: a custom plugin's skill
can **orchestrate official connectors (Outlook), custom hosted connectors (a
ticket DB), and a custom sidecar (the API-less app) in one workflow** — the
official pieces come from the catalog, and only the genuinely bespoke parts are
custom-built.

## Production note

In a real engagement this skill wouldn't stop at a text file: it would call an
`upsert_ticket` tool on a hosted MCP service (token-gated DB), and the sidecar
would pull its pick-list from that service's REST lane. The gm-toolkit
production reference implements exactly that (party-service + `upsert_npc` +
the GM Toolkit extension). This demo keeps the source static so it runs with
zero infrastructure.
