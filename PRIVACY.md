# Politique de confidentialité — highlight2anki

_Dernière mise à jour : 4 septembre 2026_

highlight2anki est une extension Chrome qui envoie un mot sélectionné sur une page web
vers votre installation locale d'Anki, avec sa traduction et sa définition.

## Données traitées

| Donnée | Où elle va | Où elle est stockée |
| --- | --- | --- |
| Clé API DeepL | Envoyée uniquement à l'API DeepL (`api-free.deepl.com` ou `api.deepl.com` selon votre plan) pour authentifier vos traductions | `chrome.storage.sync` (votre profil Chrome) |
| Mot sélectionné | Envoyé à l'API DeepL (traduction) et à `fr.wiktionary.org` (définition) | Non conservé |
| Phrase de contexte, URL et titre de la page | Envoyés uniquement à Anki via AnkiConnect sur `http://localhost:8765` | Non conservés hors d'Anki |
| Deck, type de note, association des champs, compteur de notes ajoutées, file d'attente | Aucun envoi | `chrome.storage` (votre profil Chrome) |

## Ce que nous ne faisons pas

- Aucune donnée n'est transmise à l'auteur de l'extension : il n'existe aucun serveur
  highlight2anki. Les seules destinations réseau sont DeepL, le Wiktionnaire et votre
  Anki local.
- Aucune analytique, aucun traceur, aucune publicité.
- Aucune vente ni transfert de données à des tiers.
- Aucune lecture du contenu des pages en dehors du texte que vous sélectionnez
  explicitement avant d'utiliser le menu contextuel.

## Tiers

Le texte sélectionné transite par DeepL et le Wiktionnaire, soumis à leurs propres
politiques :

- DeepL — <https://www.deepl.com/privacy>
- Wikimedia / Wiktionnaire — <https://foundation.wikimedia.org/wiki/Policy:Privacy_policy>

## Suppression

Désinstaller l'extension supprime l'intégralité des données stockées, clé DeepL comprise.

## Contact

Questions ou demandes : germain.d.dev@gmail.com
ou <https://github.com/Germain-D/highlight2anki/issues>
