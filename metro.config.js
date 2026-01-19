// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add SVG transformer support
config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
    ...config.resolver,
    assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...config.resolver.sourceExts, 'svg'],
};

// Fix for framer-motion/tslib compatibility issue on web
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Redirect framer-motion to a stub on web to avoid tslib issues
    if (platform === 'web' && moduleName === 'framer-motion') {
        return {
            filePath: require.resolve('./metro-framer-motion-stub.js'),
            type: 'sourceFile',
        };
    }
    // Default resolution for all other modules
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
