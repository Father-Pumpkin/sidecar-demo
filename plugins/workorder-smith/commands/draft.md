---
description: Draft a work-order ticket in the AcmeOps sidecar contract format.
argument-hint: "<what needs doing, any known parts/steps/assignee/priority>"
---

Use the **workorder-smith** skill to draft a work-order ticket.

Request: $ARGUMENTS

1. Read the ticket contract at
   `${CLAUDE_PLUGIN_ROOT}/skills/workorder-smith/references/ticket-contract.md`
   before writing your first ticket — the sidecar parses line-by-line, so the
   format is exact.
2. Draft the ticket. Infer sensible parts and steps from the request; ask at
   most one clarifying question, and only if the work itself is ambiguous.
3. Save it to `tickets/<WO-number>.txt` in the current project and show it in
   full so the user can paste it straight into the sidecar's manual box (or
   publish it to the shared ticket source).
