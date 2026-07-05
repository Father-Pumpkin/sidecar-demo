// The recon half of the sidecar loop. Injected into the target tab; dumps the
// page's fillable surface (inputs, buttons, custom-widget roles) as JSON. Feed
// the dump to Claude to propose the selector block for a NEW target app — and
// to diagnose exactly what moved when an app update breaks the filler. This is
// how the integration gets built and how it gets repaired.
function SD_reconPage() {
  const cap = (arr, n) => arr.slice(0, n);
  const desc = (el) => ({
    tag: el.tagName.toLowerCase(),
    type: el.type || undefined,
    aria: el.getAttribute("aria-label") || undefined,
    placeholder: el.getAttribute("placeholder") || undefined,
    id: el.id || undefined,
    testid: el.getAttribute("data-testid") || undefined,
    classes: el.className && typeof el.className === "string" ? el.className : undefined,
    text: (el.textContent || "").trim().slice(0, 60) || undefined,
  });

  return {
    href: location.href,
    title: document.title,
    counts: {
      inputs: document.querySelectorAll("input").length,
      textareas: document.querySelectorAll("textarea").length,
      buttons: document.querySelectorAll("button").length,
      selects: document.querySelectorAll("select").length,
      listboxes: document.querySelectorAll('[role="listbox"]').length,
      options: document.querySelectorAll('[role="option"]').length,
    },
    inputs: cap([...document.querySelectorAll("input, textarea")].map(desc), 60),
    buttons: cap([...document.querySelectorAll("button")].map(desc), 60),
    roleWidgets: cap(
      [...document.querySelectorAll('[role="listbox"], [role="option"], [role="combobox"], [role="menu"]')].map(desc),
      40,
    ),
  };
}

if (typeof module !== "undefined" && module.exports) module.exports = { SD_reconPage };
