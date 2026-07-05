# The 90-second demo script

What to say while it fills. Beats, not a teleprompter — the fill animation does
the selling; your job is to name what they're seeing.

## Setup (before the call)

- AcmeOps open in one tab: https://father-pumpkin.github.io/sidecar-demo/
- Sidecar loaded (`chrome://extensions` → Load unpacked → `extension/`).
- Optional: Claude Code open with `workorder-smith` installed, for beat 5.

## The beats

**1. Name the pain (15s).**
> "Every team has one of these — an internal tool or vendor portal where someone
> re-keys structured data by hand. It has no API, or the API can't touch the
> screen that matters. This fake one is AcmeOps; yours might be an ERP, an EHR,
> a dealer portal."

Click around the empty form once — show the fiddly dropdowns and row buttons.

**2. One click (20s).**
Open the sidecar, pick **WO-2481**, and *stop talking* while it fills: the
dropdowns click open, part rows add themselves, quantities land.
> "That's not a macro and not screen-recording. It's driving the app the way a
> user would — which is why it works on software that was never meant to be
> integrated."

**3. The honesty beat (15s).**
Point at the status line: `Filled 21 field(s) ✓`.
> "Every field is verified — if the app changes and something can't land, it
> tells you exactly which field it missed instead of pretending. That's the
> difference between a tool a team trusts and one they abandon."

**4. Idempotency (10s).**
Pick **WO-2492** — the surplus step row deletes itself.
> "Re-running is safe. It reconciles, it doesn't duplicate."

**5. Where the data comes from (20s).**
Show the ticket in Claude Code (`/workorder-smith:draft …`) or just the contract
file.
> "Upstream, Claude authors these against a strict contract — the contract plays
> the role of the API spec the vendor never shipped. In production the tickets
> sit in a governed database with scoped credentials, not a JSON file."

**6. The kicker — their software (10s).**
Open the sidecar's **Adapt to new software** panel on *any* app they name.
> "This Inspect button dumps any page's fillable surface. That dump is what we
> hand Claude to draft the integration for *your* system — this whole demo took
> an afternoon from a dump like that."

## Objections you'll hear

- **"What happens when the app updates?"** — The per-field miss report says
  exactly what moved; the recon dump + Claude turns that into a selector patch,
  typically same-day. It's a maintenance line item, not a rebuild. (See
  `sidecar-pattern.md` → Maintenance reality.)
- **"Is this scraping / against ToS?"** — It automates the user's own actions in
  their own authenticated session, at their initiation, on their machine. Review
  per-target ToS as part of the engagement; several vendors have precedent in
  accessibility tooling.
- **"Security?"** — The extension holds at most a read-scoped credential; writes
  happen upstream under real OAuth. Host permissions are scoped to the target
  domains only. (See `sidecar-pattern.md` → Security posture.)
- **"Why not RPA (UiPath etc.)?"** — Same category, different economics: this is
  ~300 lines you own, versioned in git, adapted by an LLM from a DOM dump in
  hours, with no per-seat license. RPA earns its cost at enterprise fleet scale;
  this wins for the long tail of one-team tools.
