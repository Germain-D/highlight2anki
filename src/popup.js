import * as anki from "./lib/anki.js";
import { verifyKey } from "./lib/deepl.js";
import { getSettings, setSettings } from "./lib/settings.js";
import { getStats, queueCount } from "./lib/queue.js";

const $ = (id) => document.getElementById(id);
const stage = $("stage");
const views = [...document.querySelectorAll(".view")];
const fieldSelects = [...document.querySelectorAll(".fields select")];
const STEPS = ["key", "anki", "fields"];

let settings = await getSettings();
// "setup" : premier lancement, on enchaîne les étapes. "edit" : retour depuis
// l'accueil via la roue crantée, chaque étape peut renvoyer à l'accueil.
let mode = settings.setupDone ? "edit" : "setup";
let current = null;
let ankiLoaded = false;

$("deepl").value = settings.deepLKey;

$("back").addEventListener("click", () => show("home", -1));
$("gear").addEventListener("click", () => openWizard());
$("key-next").addEventListener("click", submitKey);
$("anki-reload").addEventListener("click", () => loadAnki(true));
$("anki-next").addEventListener("click", submitAnki);
$("model").addEventListener("change", () => loadFields($("model").value));
$("fields-done").addEventListener("click", submitFields);
$("done-go").addEventListener("click", () => {
  mode = "edit";
  show("home", 1);
});
$("retry").addEventListener("click", retry);
$("deepl").addEventListener("keydown", (e) => e.key === "Enter" && submitKey());

for (const tab of $("seg").querySelectorAll("button")) {
  tab.addEventListener("click", () => {
    const dir = STEPS.indexOf(tab.dataset.step) > STEPS.indexOf(current) ? 1 : -1;
    show(tab.dataset.step, dir);
  });
}

show(settings.setupDone ? "home" : "key", 1);

// ---------- Navigation ----------

function show(name, dir = 1) {
  const next = views.find((v) => v.dataset.view === name);
  if (!next || next.dataset.view === current) return;
  const first = current === null;

  for (const view of views) {
    if (view === next || !view.classList.contains("is-active")) continue;
    view.style.setProperty("--from", `${-36 * dir}px`);
    view.classList.remove("is-active");
  }

  next.style.setProperty("--from", `${36 * dir}px`);
  void next.offsetWidth; // applique la position de départ avant la transition
  next.classList.add("is-active");
  current = name;

  // À l'ouverture, la fenêtre du popup suit la hauteur du document : on la fixe
  // sans transition pour éviter que Chrome n'anime l'agrandissement.
  if (first) {
    stage.style.transition = "none";
    syncHeight();
    requestAnimationFrame(() => (stage.style.transition = ""));
  } else {
    syncHeight();
  }

  syncChrome();
  onEnter(name);
}

function syncHeight() {
  const active = views.find((v) => v.classList.contains("is-active"));
  if (active) stage.style.height = `${active.offsetHeight}px`;
}

// La hauteur d'une vue bouge après coup (statut Anki, message d'erreur, bouton
// de renvoi) : la scène suit au lieu de rogner le contenu.
const observer = new ResizeObserver(syncHeight);
for (const view of views) observer.observe(view);

// Barre de titre et pied de page dépendent de la vue et du mode : pastilles de
// progression pendant l'assistant, onglets navigables une fois configuré.
function syncChrome() {
  const step = STEPS.indexOf(current);
  const wizard = step >= 0;
  $("gear").hidden = current !== "home";
  $("back").hidden = !(mode === "edit" && wizard);
  $("dots").hidden = !wizard || mode === "edit";
  $("seg").hidden = !wizard || mode !== "edit";

  for (const dot of $("dots").children) {
    const index = STEPS.indexOf(dot.dataset.step);
    dot.classList.toggle("on", index === step);
    dot.classList.toggle("done", index < step);
  }

  if (wizard && mode === "edit") {
    $("seg").querySelector(".thumb").style.translate = `${step * 100}% 0`;
    for (const tab of $("seg").querySelectorAll("button")) {
      tab.classList.toggle("on", tab.dataset.step === current);
    }
  }

  const label = mode === "edit" ? "Enregistrer" : "Continuer";
  $("key-next").querySelector("span").textContent = label;
  $("anki-next").querySelector("span").textContent = label;
  $("fields-done").querySelector("span").textContent = mode === "edit" ? "Enregistrer" : "Terminer";
}

function onEnter(name) {
  if (name === "anki" && !ankiLoaded) loadAnki();
  if (name === "key") setTimeout(() => $("deepl").focus(), 260);
  if (name === "home") {
    refreshStats();
    connectHome();
  }
}

function openWizard() {
  mode = "edit";
  show("key", 1);
}

// Étape suivante, ou retour à l'accueil si on ne fait que corriger un réglage.
function advance(step) {
  if (mode === "edit") return show("home", -1);
  show(step, 1);
}

// ---------- Étape 1 : clé DeepL ----------

async function submitKey() {
  const key = $("deepl").value.trim();
  if (!key) return reject("key", "Entrez votre clé DeepL.", $("deepl"));

  busy($("key-next"), true);
  msg("key", "", "");
  try {
    await verifyKey(key);
    settings = { ...settings, deepLKey: key };
    await setSettings({ deepLKey: key });
    advance("anki");
  } catch (err) {
    reject("key", err.message, $("deepl"));
  } finally {
    busy($("key-next"), false);
  }
}

// ---------- Étape 2 : Anki ----------

async function loadAnki(force = false) {
  if (force) ankiLoaded = false;
  status("anki-status2", "pending", "Connexion…");
  msg("anki", "", "");
  try {
    const [decks, models] = await Promise.all([anki.deckNames(), anki.modelNames()]);
    fill($("deck"), decks, settings.deckName);
    fill($("model"), models, settings.modelName);
    await loadFields($("model").value);
    ankiLoaded = true;
    status("anki-status2", "ok", "Anki connecté");
  } catch (err) {
    status("anki-status2", "ko", err.message);
  }
  syncHeight();
}

function submitAnki() {
  if (!ankiLoaded) return msg("anki", "ko", "Ouvrez Anki avec AnkiConnect, puis réessayez.");
  settings = { ...settings, deckName: $("deck").value, modelName: $("model").value };
  setSettings({ deckName: settings.deckName, modelName: settings.modelName });
  advance("fields");
}

// ---------- Étape 3 : champs ----------

async function loadFields(modelName) {
  if (!modelName) return;
  try {
    const fields = await anki.modelFieldNames(modelName);
    for (const select of fieldSelects) {
      fill(select, fields, settings.fieldMap[select.dataset.logical], "— aucun —");
    }
  } catch (err) {
    status("anki-status2", "ko", err.message);
  }
}

async function submitFields() {
  const fieldMap = Object.fromEntries(fieldSelects.map((s) => [s.dataset.logical, s.value]));
  if (!fieldMap.mot) return reject("fields", "Le champ « Mot » doit être associé.", $("f-mot"));

  settings = { ...settings, fieldMap, setupDone: true };
  await setSettings({ fieldMap, setupDone: true });

  show(mode === "edit" ? "home" : "done", mode === "edit" ? -1 : 1);
}

// ---------- Accueil ----------

async function refreshStats() {
  const [stats, pending] = await Promise.all([getStats(), queueCount()]);
  countTo($("added"), stats.added || 0);
  $("retry").hidden = pending === 0;
  $("retry").textContent = `Renvoyer ${pending} note${pending > 1 ? "s" : ""}`;
}

async function connectHome() {
  status("anki-status", "pending", "Vérification d’Anki…");
  try {
    await anki.deckNames();
    status("anki-status", "ok", "Anki connecté");
  } catch (err) {
    status("anki-status", "ko", err.message);
  }
  syncHeight();
}

async function retry() {
  $("retry").disabled = true;
  const res = await chrome.runtime.sendMessage({ type: "h2a-flush" });
  $("retry").disabled = false;
  await refreshStats();
  if (res.error) status("anki-status", "ko", `${res.sent} envoyée(s) — ${res.error}`);
  else status("anki-status", "ok", `${res.sent} envoyée(s)${res.dropped ? `, ${res.dropped} doublon(s)` : ""}`);
  syncHeight();
}

// Petit décompte animé sur le compteur d'ajouts.
function countTo(el, target) {
  const start = Number(el.textContent) || 0;
  if (start === target) return;
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min((now - t0) / 500, 1);
    el.textContent = Math.round(start + (target - start) * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- Utilitaires ----------

function fill(select, values, selected, placeholder) {
  select.textContent = "";
  if (placeholder) select.appendChild(new Option(placeholder, ""));
  for (const value of values) select.appendChild(new Option(value, value));
  // Une valeur enregistrée qui n'existe plus dans Anki ne doit pas être
  // réappliquée silencieusement.
  select.value = values.includes(selected) ? selected : placeholder ? "" : select.value;
}

function busy(button, on) {
  button.classList.toggle("busy", on);
  button.disabled = on;
}

function reject(name, text, field) {
  msg(name, "ko", text);
  field.classList.remove("shake");
  void field.offsetWidth;
  field.classList.add("shake");
  field.focus();
}

function msg(name, kind, text) {
  const el = document.querySelector(`[data-msg="${name}"]`);
  el.className = `msg ${kind} ${text ? "show" : ""}`;
  el.textContent = text;
  syncHeight();
}

function status(id, kind, text) {
  const el = $(id);
  el.className = `pill ${kind}`;
  el.querySelector("span").textContent = text;
}
