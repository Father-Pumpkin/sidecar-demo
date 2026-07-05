# The ticket contract (authoritative)

The AcmeOps sidecar parses tickets **line-by-line with no fuzz**. This file is
the single source of truth for the format. If the parser and this file ever
disagree, fixing that mismatch is the first task.

## Shape

```
WO-2481: Replace compressor bearing — Line 3
Priority High | Department Facilities | Status Open
Assignee R. Vasquez
Due 2026-07-18
Parts
Bearing 6205-2RS. qty 2 @ 14.50
Synthetic grease NLGI-2. qty 1 @ 22.00
Steps
Lockout. Isolate breaker P3-11 and verify zero energy at the panel.
Teardown. Pull the guard, belt, and pulley; extract the worn bearing.
```

## Field-by-field

| Line | Format | Maps to |
|---|---|---|
| 1 | `WO-<digits>: <title>` (prefix 1–5 caps + dash + digits) | Order # and Title |
| meta | `Priority <v> \| Department <v> \| Status <v>` — any order, `\|`-separated | the three dropdowns |
| `Assignee <name>` | free text after the keyword | Assignee |
| `Due <YYYY-MM-DD>` | ISO date somewhere on the line | Due date |
| `Parts` | lone word — starts the parts section | — |
| part row | `<Name>. qty <N> @ <cost>` (`@ <cost>` optional) | one parts row |
| `Steps` | lone word — starts the steps section | — |
| step row | `<Name>. <text>` — name ≤ ~48 chars, capitalized | one steps row |

## Hard requirements

1. **Dropdown values must exist in AcmeOps.** Priority: `Low / Medium / High /
   Critical`. Department: `Facilities / IT / Fleet / Production`. Status:
   `Open / In Progress / Blocked / Done`. Anything else → the sidecar reports
   `MISS <field> option "<value>"` and leaves the dropdown untouched.
2. **The period after a part/step name is the delimiter.** `Lockout. Isolate…`
   parses; `Lockout - Isolate…` becomes a continuation of the previous step.
3. **A step's body must not begin with a capitalized `Word.`** or it will split
   into a spurious extra step. Rephrase the opening.
4. **Sections end at the next section header.** Anything after `Steps` that
   isn't a step row is appended to the previous step's text.

## Failure modes (what you'll see when it's wrong)

- Malformed first line → Order # lands empty, the whole first line becomes the
  Title. Tell-tale: `WO-…` visible inside the Title field.
- Meta value not in the dropdown list → that dropdown stays on `Select…`, and
  the fill status shows a `MISS … option` entry.
- Missing lone `Parts`/`Steps` line → that section fills nothing (rows from a
  previous fill are deleted — the sidecar is idempotent).
