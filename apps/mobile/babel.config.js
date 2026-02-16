module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Explicitly add the expo-router babel plugin because babel-preset-expo
      // is hoisted to the monorepo root and can't resolve expo-router from there.
      require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin,
    ],
  };
};
