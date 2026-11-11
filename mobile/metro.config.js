const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'mjs' to resolver.sourceExts for lucide-react-native ESM support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;

