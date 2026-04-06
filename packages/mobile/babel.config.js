module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "@tamagui/babel-plugin",
        {
          components: ["tamagui"],
          config: "./tamagui.config.ts",
        },
      ],
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@app": "./src/app",
            "@features": "./src/features",
            "@domain": "./src/domain",
            "@data": "./src/data",
            "@infra": "./src/infra",
            "@shared": "./src/shared",
          },
        },
      ],
    ],
  };
};
