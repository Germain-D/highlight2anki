// Réglages persistés dans chrome.storage.sync (suivent le profil Chrome).

export const DEFAULTS = {
  // Passe à true une fois la configuration initiale terminée : le popup ouvre
  // alors directement l'accueil au lieu de l'assistant.
  setupDone: false,
  deepLKey: "",
  deckName: "",
  modelName: "",
  // Association entre nos 4 champs logiques et les champs réels du note type.
  fieldMap: { mot: "", traduction: "", definition: "", contexte: "" },
};

export async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return {
    ...DEFAULTS,
    ...stored,
    fieldMap: { ...DEFAULTS.fieldMap, ...(stored.fieldMap || {}) },
  };
}

export function setSettings(patch) {
  return chrome.storage.sync.set(patch);
}

// Ne garde que les champs effectivement mappés et non vides. Plusieurs champs
// logiques peuvent viser le même champ Anki (ex. traduction + définition +
// contexte au verso) : on les concatène au lieu de les écraser.
export function mapFields(fieldMap, values) {
  const fields = {};
  for (const [logical, value] of Object.entries(values)) {
    const target = fieldMap[logical];
    if (!target || !value) continue;
    fields[target] = fields[target] ? `${fields[target]}<br><br>${value}` : value;
  }
  return fields;
}
