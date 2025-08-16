module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
    '@babel/plugin-proposal-optional-chaining',
     '@babel/plugin-proposal-nullish-coalescing-operator',

      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
