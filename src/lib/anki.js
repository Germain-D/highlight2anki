// Client AnkiConnect (add-on Anki écoutant en local).
const ANKI_URL = "http://localhost:8765";

export class AnkiUnreachableError extends Error {}

export async function invoke(action, params = {}) {
  let res;
  try {
    res = await fetch(ANKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, version: 6, params }),
    });
  } catch {
    throw new AnkiUnreachableError(
      "Anki injoignable — lancez Anki et vérifiez la config CORS d'AnkiConnect."
    );
  }
  if (!res.ok) throw new AnkiUnreachableError(`AnkiConnect HTTP ${res.status}`);
  // AnkiConnect répond toujours 200 : l'erreur est dans le corps.
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export const deckNames = () => invoke("deckNames");
export const modelNames = () => invoke("modelNames");
export const modelFieldNames = (modelName) => invoke("modelFieldNames", { modelName });

export async function ping() {
  await invoke("deckNames");
  return true;
}

export function addNote({ deckName, modelName, fields }) {
  return invoke("addNote", {
    note: {
      deckName,
      modelName,
      fields,
      tags: ["highlight2anki"],
      options: { allowDuplicate: false },
    },
  });
}

export function isDuplicateError(err) {
  return /duplicate/i.test(err?.message || "");
}
