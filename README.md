# highlight2anki

Extension Chrome (Manifest V3) pour envoyer un mot lu sur le web dans Anki en un clic
droit, avec sa traduction (DeepL), sa définition française (Wiktionnaire) et la phrase où il
a été rencontré.

## Prérequis

- Anki avec l'add-on [AnkiConnect](https://ankiweb.net/shared/info/2055492159) (code `2055492159`)
- Une clé [DeepL API](https://www.deepl.com/pro-api), Free ou Pro (le domaine d'API est
  déduit de la clé : les clés Free se terminent par `:fx`)

## Installation

1. `chrome://extensions` → activer **Mode développeur** → **Charger l'extension non empaquetée** → choisir ce dossier.
2. Noter l'**ID** affiché sous le nom de l'extension.
3. **Autoriser l'extension dans AnkiConnect** (indispensable, sinon tous les appels échouent en CORS) :
   Anki → *Outils → Modules complémentaires → AnkiConnect → Configuration*, puis ajouter
   l'origine de l'extension à `webCorsOriginList` :

   ```json
   {
     "webCorsOriginList": ["http://localhost", "chrome-extension://VOTRE_ID_EXTENSION"]
   }
   ```

   Redémarrer Anki.
4. Ouvrir le popup de l'extension : au premier lancement, un assistant en trois étapes
   demande la clé DeepL (vérifiée auprès de DeepL avant de continuer), le deck et le type
   de note, puis l'association des quatre champs (`Mot`, `Traduction`, `Définition`,
   `Contexte`). Ensuite le popup ouvre l'accueil ; la roue crantée rouvre les réglages.

Seul le champ `Mot` est obligatoire : laisser un des trois autres sur « — aucun — » si le
note type ne prévoit rien pour lui.

## Usage

Sélectionner un mot sur une page → clic droit → **Ajouter à Anki**. Un toast confirme
l'ajout avec la traduction et la définition ; il disparaît après ~2,5 s.

## Comportement en cas d'échec

| Situation | Effet |
| --- | --- |
| Anki fermé / CORS non configuré | La note est mise en file locale, un bouton **Renvoyer n notes** apparaît dans le popup |
| DeepL indisponible, clé invalide ou quota épuisé | La note est créée quand même, `Traduction` vide |
| Mot absent du Wiktionnaire | `Définition` vide, pas d'erreur |
| Mot déjà présent dans le deck | Toast « Déjà dans Anki », rien n'est mis en file |
| Langue détectée = FR | Pas de traduction, la définition porte sur le mot d'origine |

La file est aussi rejouée automatiquement au démarrage de Chrome.

## Structure

```
manifest.json
src/
  background.js    service worker : menu contextuel, orchestration, rejeu de la file
  content.js       toast injecté à la demande
  popup.{html,css,js}
  lib/
    anki.js        client AnkiConnect
    deepl.js       traduction (Free ou Pro selon la clé)
    wiktionary.js  définition
    queue.js       file d'attente + compteur (chrome.storage.local)
    settings.js    réglages (chrome.storage.sync) + mapping des champs
```

Aucune étape de build : les modules ES sont chargés directement par Chrome.
