import type { StorybookConfig } from '@storybook/react-native-web-vite';
import type { UserConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {
      modulesToTranspile: ["@expo/ui"],
    },
  },
  staticDirs: ["../public"],
  async viteFinal(baseConfig) {
    const optimizeDeps = baseConfig.optimizeDeps ?? {};
    const excluded = new Set(optimizeDeps.exclude ?? []);
    for (const pkg of [
      "expo",
      "expo-modules-core",
      "expo-constants",
      "expo-file-system",
      "expo-linking",
      "expo-router",
      "expo-secure-store",
      "expo-symbols",
      "expo-web-browser",
      "@expo/ui",
    ]) {
      excluded.add(pkg);
    }

    return {
      ...baseConfig,
      optimizeDeps: {
        ...optimizeDeps,
        exclude: [...excluded],
      },
    } satisfies UserConfig;
  },
};
export default config;
