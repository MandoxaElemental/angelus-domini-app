const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.minifierPath = "metro-minify-terser";

// Let Metro treat .mp4 as a static asset so require() can resolve it
config.resolver.assetExts.push("mp4");

module.exports = config;