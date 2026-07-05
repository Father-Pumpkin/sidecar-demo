// Popup logic: fetch the ticket list from the shared source (a static JSON in
// this demo; a token-gated REST lane in production), render a pick-list, and
// inject the filler into the active AcmeOps tab. Mirrors the gm-toolkit
// extension's shape at demo scale.
const $ = (id) => document.getElementById(id);
const DEFAULT_SRC = "https://father-pumpkin.github.io/sidecar-demo/tickets.json";

function setStatus(msg, kind) {
  const s = $("status");
  s.textContent = msg;
  s.className = kind || "";
}

const getSrc = () =>
  new Promise((res) => chrome.storage.local.get(["ticketSrc"], (v) => res(v.ticketSrc || DEFAULT_SRC)));

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function fillTicket(data) {
  setStatus(`Filling ${data.number || "ticket"}…`);
  const tab = await activeTab();
  if (!tab) return setStatus("Open the AcmeOps tab first.", "err");
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: SD_fillTicket,
      args: [data],
    });
    const hit = (results || []).map((r) => r && r.result).find((r) => r && r.log);
    if (!hit) return setStatus("No AcmeOps page found in this tab.", "err");
    console.log("[Sidecar] fill log:\n" + hit.log.join("\n"));
    const missed = hit.log.filter((l) => l.startsWith("MISS")).map((l) => l.slice(5));
    const setN = hit.log.filter((l) => l.startsWith("set ")).length;
    if (missed.length) {
      setStatus(`Filled ${setN} field(s); ${missed.length} missed: ${missed.slice(0, 3).join("; ")}${missed.length > 3 ? "…" : ""} (full log in console)`, "err");
    } else {
      setStatus(`Filled ${setN} field(s) ✓ — review and Save in AcmeOps.`, "ok");
    }
  } catch (e) {
    setStatus("Fill failed: " + ((e && e.message) || e), "err");
  }
}

function renderTickets(tickets) {
  const box = $("tickets");
  box.innerHTML = "";
  if (!tickets.length) {
    box.innerHTML = '<p class="sub">No tickets at the source.</p>';
    return;
  }
  for (const t of tickets) {
    const b = document.createElement("button");
    b.className = "ticket";
    const [num, ...rest] = t.name.split("—");
    b.innerHTML = `<b>${num.trim()}</b> ${rest.join("—").trim()}`;
    b.title = "Fill the open AcmeOps tab with this ticket";
    b.addEventListener("click", () => fillTicket(SD_parseTicket(t.text)));
    box.appendChild(b);
  }
}

async function loadTickets() {
  const src = await getSrc();
  $("src").value = src;
  try {
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) return setStatus(`Ticket source returned HTTP ${res.status}.`, "err");
    const data = await res.json();
    renderTickets(data.tickets || []);
    setStatus(`${(data.tickets || []).length} ticket(s) loaded.`);
  } catch (e) {
    $("tickets").innerHTML = '<p class="sub">Could not reach the ticket source.</p>';
    setStatus("Load failed: " + ((e && e.message) || e), "err");
  }
}

$("refresh").addEventListener("click", loadTickets);
$("fillraw").addEventListener("click", () => {
  const raw = $("raw").value.trim();
  if (!raw) return setStatus("Paste a ticket first.", "err");
  fillTicket(SD_parseTicket(raw));
});
$("savesrc").addEventListener("click", () => {
  chrome.storage.local.set({ ticketSrc: $("src").value.trim() }, () => {
    setStatus("Source saved.", "ok");
    loadTickets();
  });
});

$("recon").addEventListener("click", async () => {
  setStatus("Inspecting the open tab…");
  const tab = await activeTab();
  if (!tab) return setStatus("Open the target tab first.", "err");
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: SD_reconPage,
    });
    const dump = (results || []).map((r) => r && r.result).find(Boolean);
    if (!dump) return setStatus("Recon returned nothing.", "err");
    const text = JSON.stringify(dump, null, 2);
    console.log("[Sidecar] recon:\n" + text);
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Recon copied (${dump.counts.inputs} inputs, ${dump.counts.buttons} buttons) — paste it to Claude.`, "ok");
    } catch {
      setStatus("Recon in the console (clipboard unavailable).", "err");
    }
  } catch (e) {
    setStatus("Recon failed: " + ((e && e.message) || e), "err");
  }
});

loadTickets();
