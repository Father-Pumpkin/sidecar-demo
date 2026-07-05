// The in-page writer. Injected into the AcmeOps tab via
// chrome.scripting.executeScript({ world: "MAIN" }) so it runs in the page's own
// JS context and can use the native value setters React listens to.
//
// Pattern notes (this is the generalizable part):
//  - SELECTORS ARE ISOLATED at the top. When the target app's DOM shifts, this
//    block is the only thing to update.
//  - React-controlled inputs ignore plain `.value =` writes; set via the native
//    prototype setter, then dispatch `input` so React's onChange fires.
//  - Custom dropdowns are driven the way a user would: click the trigger, wait
//    for the menu, click the option by its text.
//  - Idempotent: dynamic rows are topped up with the "+ Add" button and surplus
//    rows from a previous fill are deleted from the end.
//  - Honest logging: every attempt logs `set` or `MISS <field>` — the popup
//    surfaces misses to the user instead of pretending success.
async function SD_fillTicket(data) {
  const log = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- selectors (the ONLY app-coupled part) --------------------------------
  const SEL = {
    header: (label) => document.querySelector(`input[aria-label="${label}"]`),
    fsTrigger: (label) => document.querySelector(`.fs[data-label="${label}"] .fs-trigger`),
    fsOptions: () => [...document.querySelectorAll('.fs-menu [role="option"]')],
    partName: () => [...document.querySelectorAll('input[placeholder="Part name"]')],
    partQty: (row) => nextMatching(row, 'input[aria-label="Quantity"]'),
    partCost: (row) => nextMatching(row, 'input[placeholder="Unit cost"]'),
    stepName: () => [...document.querySelectorAll('input[placeholder="Step name"]')],
    stepText: (row) => nextMatching(row, 'textarea[placeholder="Details"]'),
    addBtn: (text) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === text),
    delBtn: (row, label) => nextMatching(row, `button[aria-label="${label}"]`),
  };
  // ---------------------------------------------------------------------------

  function nextMatching(fromEl, selector) {
    return [...document.querySelectorAll(selector)].find(
      (el) => fromEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  }

  const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const areaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  function setVal(el, v) {
    if (!el) return false;
    (el.tagName === "TEXTAREA" ? areaSetter : inputSetter).call(el, String(v ?? ""));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  const put = (label, el, v) =>
    log.push(setVal(el, v) ? `set  ${label}` : `MISS ${label}`);

  async function setFancy(label, value) {
    if (!value) return;
    const trig = SEL.fsTrigger(label);
    if (!trig) return log.push(`MISS ${label} (no trigger)`);
    trig.click();
    await sleep(120);
    const opt = SEL.fsOptions().find((o) => o.textContent.trim() === value);
    if (!opt) {
      log.push(`MISS ${label} option "${value}"`);
      trig.click(); // close the menu again
      return;
    }
    opt.click();
    log.push(`set  ${label} = ${value}`);
    await sleep(60);
  }

  async function fillRows({ label, items, rows, addText, delLabel, write }) {
    for (let i = 0; i < items.length; i++) {
      let r = rows();
      if (i >= r.length) {
        const btn = SEL.addBtn(addText);
        if (!btn) { log.push(`MISS ${label} add button`); break; }
        btn.click();
        await sleep(120);
        r = rows();
      }
      if (!r[i]) { log.push(`MISS ${label} row ${i + 1}`); continue; }
      write(r[i], items[i], i);
      await sleep(60);
    }
    // Idempotent re-fill: delete surplus rows from a previous fill, last-first.
    let guard = 0;
    while (rows().length > items.length && guard++ < 30) {
      const r = rows();
      const del = SEL.delBtn(r[r.length - 1], delLabel);
      if (!del) { log.push(`MISS ${label} delete surplus row`); break; }
      del.click();
      log.push(`del  ${label} surplus row`);
      await sleep(100);
    }
  }

  // Header fields
  put("Order number", SEL.header("Order number"), data.number);
  put("Title", SEL.header("Title"), data.title);
  put("Assignee", SEL.header("Assignee"), data.assignee);
  put("Due date", SEL.header("Due date"), data.due);
  await setFancy("Priority", data.priority);
  await setFancy("Department", data.department);
  await setFancy("Status", data.status);

  // Parts
  await fillRows({
    label: "Part",
    items: data.parts || [],
    rows: SEL.partName,
    addText: "+ Add part",
    delLabel: "Remove part",
    write: (nameEl, p) => {
      put(`Part "${p.name}" name`, nameEl, p.name);
      put(`Part "${p.name}" qty`, SEL.partQty(nameEl), p.qty);
      put(`Part "${p.name}" cost`, SEL.partCost(nameEl), p.cost);
    },
  });

  // Steps
  await fillRows({
    label: "Step",
    items: data.steps || [],
    rows: SEL.stepName,
    addText: "+ Add step",
    delLabel: "Remove step",
    write: (nameEl, s) => {
      put(`Step "${s.name}" name`, nameEl, s.name);
      put(`Step "${s.name}" text`, SEL.stepText(nameEl), s.text);
    },
  });

  return { href: location.href, log };
}

if (typeof module !== "undefined" && module.exports) module.exports = { SD_fillTicket };
