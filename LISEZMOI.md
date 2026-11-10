# Appli Frelons (Android)

Application téléphone du système de pistage du frelon asiatique. Elle est écrite en React Native avec Expo SDK 58 et TypeScript.

## Contenu de cette première version

| Partie | État |
|---|---|
| Socle : onglets Direct, Carte, Portatif, Chrono, Réglages | fait |
| **Sortie simulée** : rejoue une vraie sortie enregistrée (×1, ×10, ×30) | fait |
| **Direct** : boussole, nord en haut, direction du tag, cône ±12°, niveaux des 5 voies en %, pile, nid estimé | fait |
| **Carte** : trajet, relèvements retenus et écartés, directions à l'œil, nid avec sa précision, échelle, zoom, envoi au portatif, carnet | fait |
| Liaison Bluetooth avec le toit (« TOIT-Frelons ») | écrite, à essayer sur le vrai toit |
| Portatif, Chrono et les autres écrans du cahier des charges | à venir |

Les calculs sont un portage direct du code de l'écran de la voiture :

- `src/calc/estim.ts` reprend `estim.c` ;
- `src/calc/releves.ts` reprend `data.c` ;
- `src/calc/fusion.ts` reprend `fusion.c`.

Ils ont été vérifiés sur 40 cas tirés au hasard. Le C et le TypeScript donnent le même nid, avec moins de 1 cm d'écart.

Sur la sortie simulée, le nid du tag 7 est retrouvé à 4 m du vrai. Pour vérifier de nouveau, lancez `npm run test:calculs`.

## Installer l'appli sur le téléphone (APK)

**Le plus simple** : à chaque envoi sur GitHub, la compilation se lance seule (onglet **Actions** du dépôt). L'APK se télécharge en bas de la page de la compilation, rubrique « Artifacts ».

**Sinon, avec EAS** :

1. Installez Node.js 20 ou une version plus récente, puis créez un compte gratuit sur expo.dev.
2. Dans ce dossier, lancez :
   ```
   npm install --legacy-peer-deps
   npx eas-cli@latest login
   npx eas-cli@latest build -p android --profile preview
   ```
3. Une fois la compilation terminée, EAS affiche un lien et un QR code. Ouvrez-le sur le téléphone et installez l'APK. Il faut autoriser l'installation depuis cette source.

L'appli utilise le Bluetooth natif. Elle ne fonctionne donc **pas dans Expo Go** : il faut passer par l'APK.

## Essayer sans matériel

Dans l'onglet **Réglages**, touchez **Lancer la sortie simulée**, à la vitesse ×30. Allez ensuite sur **Direct** puis sur **Carte**.

## Développer

Avant tout, lancez `npm run preparer` (Python 3 et `pip install pillow`) : il fabrique la sortie simulée et les icônes, qui ne sont pas stockées dans le dépôt.

- `npm run typecheck` : vérifie les types.
- `npm run test:calculs` : rejoue la sortie simulée et la compare aux vrais nids.
- `npx expo start --web` : aperçu rapide dans le navigateur, sans Bluetooth (il faut installer `react-native-web` et `react-dom`, déjà présents).

## Organisation du code

```
src/app/            écrans (expo-router) : (onglets)/index = Direct, carte, portatif, chrono, reglages
src/calc/           calculs : géographie, relèvements, fusion, aller-retour
src/proto/          décodage des lignes du toit (CSV) et du portatif (JSON), commandes
src/store/          état partagé de l'appli
src/sources/        simulation (rejeu) et Bluetooth (UART Nordic)
src/sim/            sortie enregistrée embarquée (R0001.CSV)
src/db.ts           journal SQLite (sorties, relèvements, nids)
scripts/            test des calculs
```
