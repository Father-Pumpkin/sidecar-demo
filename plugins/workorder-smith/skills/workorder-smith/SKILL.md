---
name: workorder-smith
description: Author work-order tickets in the exact contract format the AcmeOps sidecar extension parses and fills into the API-less AcmeOps work-order UI. Use when the user wants to draft, write, or revise a work order / maintenance ticket for the AcmeOps demo.
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

## Production note

In a real engagement this skill wouldn't stop at a text file: it would call an
`upsert_ticket` tool on a hosted MCP service (token-gated DB), and the sidecar
would pull its pick-list from that service's REST lane. The gm-toolkit
production reference implements exactly that (party-service + `upsert_npc` +
the GM Toolkit extension). This demo keeps the source static so it runs with
zero infrastructure.
