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
5. On confirmation, **compose the reply**: WO number, priority, assignee if
   known, and a one-line summary of the planned steps. Deliver it per the SKILL's
   "Close the loop" rules — if the custom **`outlook-write`** connector is
   connected, call `create_reply_draft` so the reply lands in Outlook Drafts and
   give the user its `webLink`; otherwise present paste-ready text with the
   email's `webLink`. Either way a **human clicks Send** — nothing here sends
   autonomously.
