// DeepL — auto-détection de la langue source, cible FR.
// Les clés Free se terminent par ":fx", les clés Pro non : le domaine d'API
// diffère selon le plan. On déduit le domaine de la clé, avec repli sur
// l'autre domaine si DeepL refuse (clé collée avec un suffixe inattendu).
const FREE = "https://api-free.deepl.com";
const PRO = "https://api.deepl.com";

export function apiBase(apiKey) {
  return /:fx$/.test((apiKey || "").trim()) ? FREE : PRO;
}

function otherBase(base) {
  return base === FREE ? PRO : FREE;
}

async function callDeepL(path, apiKey, init = {}) {
  const key = (apiKey || "").trim();
  if (!key) throw new Error("Clé DeepL manquante");
  const headers = { ...init.headers, Authorization: `DeepL-Auth-Key ${key}` };
  const first = apiBase(key);

  let res = await fetch(first + path, { ...init, headers });
  // 403 = mauvais plan pour ce domaine aussi bien que clé invalide : on
  // retente une fois sur l'autre domaine avant de conclure au refus.
  if (res.status === 403) {
    res = await fetch(otherBase(first) + path, { ...init, headers });
  }
  if (res.status === 403) throw new Error("Clé refusée par DeepL.");
  if (res.status === 456) throw new Error("Quota DeepL épuisé pour ce mois.");
  if (!res.ok) throw new Error(`DeepL HTTP ${res.status}`);
  return res.json();
}

// Vérifie une clé sans consommer de quota de traduction.
export function verifyKey(apiKey) {
  return callDeepL("/v2/usage", apiKey);
}

export async function translate(text, apiKey) {
  const data = await callDeepL("/v2/translate", apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // source_lang volontairement omis : DeepL détecte.
    body: JSON.stringify({ text: [text], target_lang: "FR" }),
  });
  const first = data?.translations?.[0];
  if (!first) throw new Error("DeepL : réponse vide");
  return { text: first.text, detectedLang: first.detected_source_language };
}
