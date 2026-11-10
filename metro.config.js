// Config Metro par défaut d'Expo + fichiers .wasm (base SQLite en aperçu web).
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');
module.exports = config;
