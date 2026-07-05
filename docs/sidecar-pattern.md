# The sidecar pattern — integrating software that has no API

The repeatable method this demo implements. Generalizes to any web UI a
business drives by hand: legacy ERPs, vertical SaaS, vendor portals, admin
consoles.

## When to reach for it

- The system has **no API**, a read-only API, or an API that can't reach the
  part you need (our production case: Roll20's 2024 character sheets — the
  official scripting API literally cannot write them).
- The workflow is **swivel-chair**: someone re-keys structured data from one
  place into the target UI.
- You control the *source* of the data (a Claude Code plugin, a DB, a doc
  pipeline) and just need the last mile.

## The five moving parts

1. **A contract** (`ticket-contract.md` here). A strict, versioned text/JSON
   format that the authoring side emits and the sidecar parses. This replaces
   the API spec the vendor never gave you. Write down the failure modes, not
   just the happy path.
2. **An authoring lane** — a Claude Code plugin whose skill produces payloads
   *validated against the contract*. Claude is good at this precisely because
   the contract is explicit.
3. **A shared source** — where payloads wait for the operator. Demo: a static
   JSON. Production: a token-gated REST endpoint on a hosted MCP service,
   backed by a least-privilege DB role (read-only, one table) so the sidecar
   credential can't do anything else.
4. **The sidecar** — an MV3 extension that injects into the target tab
   (`chrome.scripting.executeScript`, `world: "MAIN"`) and drives the UI.
5. **A recon loop** — a popup action that dumps the target's DOM shape
   (inputs, buttons, aria labels, test-ids) so a model can propose selectors
   and diagnose breakage after the target app updates. The recon → analyze →
   adjust cycle is how the integration gets built *and* how it gets repaired.

## The techniques that make the filler reliable

- **Native value setters.** Modern frontends (React/Vue) ignore `.value =`.
  Set via `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,
  "value").set.call(el, v)` then dispatch `input` — the framework's onChange
  fires and *state* updates, not just pixels.
- **Drive custom widgets like a user.** Non-native dropdowns: click the
  trigger, await the menu, click the option by text. Never reach into
  framework internals — they churn faster than the DOM.
- **Selector isolation.** Every app-coupled selector lives in ONE block at the
  top of the filler. DOM drift = one block to update, guided by recon output.
- **Idempotent fills.** Dynamic rows are topped up with the app's own "+ Add"
  button and surplus rows from a previous fill are deleted from the end. Re-run
  safety is what makes the tool trustworthy at a desk.
- **Honest logging.** Every attempt logs `set` or `MISS <field>`; the popup
  surfaces the misses. A fill that silently drops fields is worse than none —
  this is the difference between a tool people trust and one they abandon.
- **Bounded waits.** Waits poll for the DOM condition with a cap, they don't
  sleep and hope (keep fixed sleeps only where the target renders atomically).

## Security posture

- Host permissions scoped to the target domains only; `activeTab` +
  `scripting`, nothing broader.
- The sidecar holds at most a **read-scoped** credential to the shared source
  (in production: a token that can only read one table through one endpoint).
  Writes happen on the authoring side under real auth (OAuth to the MCP
  service), never from the extension.
- The extension never exfiltrates target-app data by default; recon dumps are
  user-initiated and land in the user's clipboard, not a server.

## Maintenance reality (set expectations)

DOM coupling is rented, not owned: the target app WILL update. Budget for it —
the recon loop turns "it broke" into a 15-minute selector patch, and the
per-field MISS log tells you *what* broke before anyone files a bug. This is a
support-contract line item, not a defect.

## Production reference

The gm-toolkit hub (private) runs this pattern for real against Roll20: hosted
MCP services (OAuth resource servers) + Neon DB with a read-only role + a
token-gated REST lane + the GM Toolkit extension filling 2024 character sheets
inside a cross-origin iframe. This demo is that architecture with the infra
swapped for a static JSON so it runs anywhere in three minutes.
