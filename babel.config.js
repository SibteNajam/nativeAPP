module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Required for moti and react-native-reanimated
            'react-native-reanimated/plugin',
        ],
    };
};
