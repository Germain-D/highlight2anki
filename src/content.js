// Injecté à la demande par background.js — le garde évite d'empiler les
// listeners quand on ajoute plusieurs mots sur la même page.
if (!window.__h2aReady) {
  window.__h2aReady = true;

  const HOST_ID = "h2a-toast-host";
  let hideTimer = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "h2a-toast") showToast(msg);
  });

  function showToast({ level, title, body, traduction, definition }) {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      document.documentElement.appendChild(host);
    }
    host.className = level === "error" ? "h2a-error" : "h2a-success";

    const lines = [];
    if (traduction) lines.push(traduction);
    if (definition) lines.push(truncate(definition, 140));
    if (body) lines.push(body);

    host.textContent = "";
    const heading = document.createElement("strong");
    heading.textContent = title || "";
    host.appendChild(heading);
    for (const line of lines) {
      const p = document.createElement("span");
      p.textContent = line;
      host.appendChild(p);
    }

    // Force un reflow pour rejouer la transition d'entrée sur un toast réutilisé.
    host.classList.remove("h2a-visible");
    void host.offsetWidth;
    host.classList.add("h2a-visible");

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => host.classList.remove("h2a-visible"), 2500);
  }

  function truncate(text, max) {
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  }
}
