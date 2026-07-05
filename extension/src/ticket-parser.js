// Parse a work-order ticket (plain text, per the ticket contract) into the flat
// object the filler consumes. Pure text processing — no DOM, no network — so it
// is unit-testable outside the browser. Mirror of the gm-toolkit statblock
// parser pattern: header lines by prefix, then named sections of "Name. text"
// rows. See plugins/workorder-smith/skills/workorder-smith/references/ticket-contract.md.
(function (global) {
  function parseTicket(text) {
    const ne = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const get = (re) => ne.find((l) => re.test(l)) || "";

    // Line 1: "WO-1234: Title — optional location"
    const head = (ne[0] || "").match(/^([A-Z]{1,5}-\d+)\s*:\s*(.+)$/);
    const number = head ? head[1] : "";
    const title = head ? head[2].trim() : ne[0] || "";

    // "Priority High | Department Facilities | Status Open" (any order, | separated)
    const meta = {};
    get(/^(Priority|Department|Status)\b/i)
      .split("|")
      .forEach((part) => {
        const m = part.trim().match(/^(Priority|Department|Status)\s+(.+)$/i);
        if (m) meta[m[1].toLowerCase()] = m[2].trim();
      });

    const assignee = get(/^Assignee\s+/i).replace(/^Assignee\s+/i, "");
    const due = (get(/^Due\s+/i).match(/\d{4}-\d{2}-\d{2}/) || [""])[0];

    // Sections: lines under "Parts" / "Steps" until the next section header.
    const SECTION = /^(Parts|Steps)$/i;
    const sectionLines = (name) => {
      const start = ne.findIndex((l) => new RegExp("^" + name + "$", "i").test(l));
      if (start < 0) return [];
      let end = ne.length;
      for (let i = start + 1; i < ne.length; i++) {
        if (SECTION.test(ne[i])) { end = i; break; }
      }
      return ne.slice(start + 1, end);
    };

    // Part row: "Name. qty N @ cost"
    const parts = sectionLines("Parts")
      .map((l) => {
        const m = l.match(/^(.+?)\.\s+qty\s+(\d+)(?:\s*@\s*([\d.]+))?/i);
        return m ? { name: m[1].trim(), qty: parseInt(m[2], 10), cost: m[3] || "" } : null;
      })
      .filter(Boolean);

    // Step row: "Name. text" — continuation lines append to the previous step.
    const steps = [];
    for (const l of sectionLines("Steps")) {
      const m = l.match(/^([A-Z][A-Za-z '\-()0-9/]{0,48}?)\.\s+(.*)$/);
      if (m) steps.push({ name: m[1].trim(), text: m[2].trim() });
      else if (steps.length) steps[steps.length - 1].text += " " + l;
    }

    return {
      number,
      title,
      priority: meta.priority || "",
      department: meta.department || "",
      status: meta.status || "",
      assignee,
      due,
      parts,
      steps,
    };
  }

  global.SD_parseTicket = parseTicket;
  if (typeof module !== "undefined" && module.exports) module.exports = { parseTicket };
})(typeof window !== "undefined" ? window : globalThis);
