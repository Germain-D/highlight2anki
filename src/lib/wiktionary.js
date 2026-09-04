// Wiktionnaire — définition en français d'un mot français. API publique
// Wikimedia, sans clé ni quota.
const BASE = "https://fr.wiktionary.org/w/api.php";

export async function define(word) {
  const url =
    `${BASE}?action=query&titles=${encodeURIComponent(word)}` +
    `&prop=extracts&explaintext=1&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wiktionnaire HTTP ${res.status}`);
  const data = await res.json();
  const page = Object.values(data.query?.pages || {})[0];
  return extractFirstDefinition(page?.extract || "");
}

// L'extrait est du texte brut : "== Français ==", puis "=== Nom commun ===",
// puis une ligne vedette (mot + prononciation API entre \ \), puis la
// définition, puis des citations. On saute la ligne vedette (repérable à sa
// transcription API) pour ne garder que la définition.
function extractFirstDefinition(text) {
  const frIndex = text.indexOf("== Français ==");
  if (frIndex === -1) return "";
  const lines = text.slice(frIndex).split("\n");
  let sawHeadword = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("=")) continue;
    if (!sawHeadword) {
      // Ligne vedette : contient une transcription API entre backslashes.
      if (trimmed.includes("\\")) sawHeadword = true;
      continue;
    }
    return trimmed;
  }
  return "";
}
