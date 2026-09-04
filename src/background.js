import * as anki from "./lib/anki.js";
import { translate } from "./lib/deepl.js";
import { define } from "./lib/wiktionary.js";
import { getSettings, mapFields } from "./lib/settings.js";
import { enqueue, flush, incrementAdded, queueCount } from "./lib/queue.js";

const MENU_ID = "add-to-anki";
// Au-delà, on est face à un paragraphe, pas à un mot de vocabulaire.
const MAX_SELECTION = 80;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Ajouter à Anki",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  handleSelection(info, tab).catch((err) => console.error("highlight2anki:", err));
});

// Le popup délègue le rejeu de la file au service worker.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "h2a-flush") return;
  flush(anki.addNote).then(
    (r) => sendResponse({ ...r, error: r.error ? r.error.message : null }),
    (err) => sendResponse({ sent: 0, dropped: 0, remaining: null, error: err.message })
  );
  return true; // réponse asynchrone
});

async function handleSelection(info, tab) {
  const word = (info.selectionText || "").trim().replace(/\s+/g, " ");
  if (!word) return;

  if (word.length > MAX_SELECTION) {
    return toast(tab.id, { level: "error", title: "Sélection trop longue" });
  }

  const settings = await getSettings();
  if (!settings.deckName || !settings.modelName || !settings.fieldMap.mot) {
    return toast(tab.id, {
      level: "error",
      title: "Configuration incomplète",
      body: "Ouvrez le popup pour choisir le deck, le type de note et les champs.",
    });
  }

  const contexte = await captureContext(tab.id, word);

  // Chaîne dégradable : chaque enrichissement qui échoue laisse son champ vide.
  let traduction = "";
  let lookup = word;
  try {
    const result = await translate(word, settings.deepLKey);
    if (result.detectedLang !== "FR") {
      traduction = result.text;
      lookup = result.text;
    }
  } catch (err) {
    console.warn("highlight2anki: DeepL", err);
  }

  let definition = "";
  try {
    definition = await define(lookup);
  } catch (err) {
    console.warn("highlight2anki: Wiktionnaire", err);
  }

  const note = {
    deckName: settings.deckName,
    modelName: settings.modelName,
    fields: mapFields(settings.fieldMap, { mot: word, traduction, definition, contexte }),
  };

  try {
    await anki.addNote(note);
    await incrementAdded();
    await toast(tab.id, { level: "success", title: word, traduction, definition });
  } catch (err) {
    if (anki.isDuplicateError(err)) {
      // Rejouer un doublon échouera toujours : inutile de le mettre en file.
      return toast(tab.id, { level: "error", title: word, body: "Déjà dans Anki." });
    }
    const pending = await enqueue(note);
    await toast(tab.id, {
      level: "error",
      title: word,
      body: `Anki injoignable — mis en file (${pending}).`,
    });
  }
}

async function captureContext(tabId, word) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: grabSentence,
      args: [word],
    });
    return result?.result || "";
  } catch (err) {
    console.warn("highlight2anki: contexte", err);
    return "";
  }
}

// Exécuté dans la page : isole la phrase contenant la sélection.
function grabSentence(word) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  const node = sel.anchorNode;
  const block = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const text = (block?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?…])\s+/);
  const hit = sentences.find((s) => s.toLowerCase().includes(word.toLowerCase()));
  return (hit || text).slice(0, 300);
}

async function toast(tabId, payload) {
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["src/content.css"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content.js"] });
    await chrome.tabs.sendMessage(tabId, { type: "h2a-toast", ...payload });
  } catch (err) {
    // Pages où l'injection est interdite (chrome://, Web Store…) : on n'a pas
    // de canal d'affichage, l'ajout lui-même a déjà eu lieu.
    console.warn("highlight2anki: toast", err);
  }
}

// Tentative de rejeu opportuniste au démarrage du navigateur.
chrome.runtime.onStartup?.addListener(async () => {
  if (await queueCount()) flush(anki.addNote).catch(() => {});
});
