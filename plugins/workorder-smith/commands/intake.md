---
description: Turn work-request emails (official Outlook/Microsoft 365 connector) into contract tickets, and reply with the WO number once placed.
argument-hint: "[sender, subject keywords, or 'latest'] — defaults to recent unread work requests"
---

Use the **workorder-smith** skill's *email intake* flow.

Request: $ARGUMENTS

1. Check that the official **Microsoft 365 / Outlook** connector is available.
   If it isn't, say so and fall back to asking the user to paste the request
   email's text — never block on the connector.
2. Search the inbox for the work request(s) the user described (sender, subject,
   or the most recent unread request-like emails). Read the matching email(s).
3. For each request, draft a ticket per the contract
   (`${CLAUDE_PLUGIN_ROOT}/skills/workorder-smith/references/ticket-contract.md`),
   pulling what the email gives you (what's broken, where, urgency → Priority,
   requester → mention in Steps if relevant) and inferring sensible parts/steps.
   Save to `tickets/<WO-number>.txt` and show the ticket.
4. Tell the user to place it via the sidecar (pick-list or paste → Fill), and
   ask them to confirm when it's saved in AcmeOps.
5. On confirmation, **draft the reply text** for the requester: WO number,
   priority, assignee if known, and a one-line summary of the planned steps.
   The official M365 connector is **read-only** (search/read — it cannot send
   mail), so present the draft ready to copy, alongside the original email's
   `webLink` so the user can open it in Outlook and paste the reply in one
   step. The human clicking Send is the governance boundary, not a limitation
   to apologize for.
