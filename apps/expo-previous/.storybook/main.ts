import type { StorybookConfig } from '@storybook/react-native-web-vite';
import type { UserConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

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
      "expo-haptics",
      "expo-modules-core",
      "expo-constants",
      "expo-file-system",
      "expo-linking",
      "expo-router",
      "expo-secure-store",
      "expo-symbols",
      "expo-sensors",
      "expo-web-browser",
      "@expo/ui",
    ]) {
      excluded.add(pkg);
    }

    return {
      ...baseConfig,
      resolve: {
        ...(baseConfig.resolve ?? {}),
        alias: {
          ...(baseConfig.resolve?.alias ?? {}),
          "expo-haptics": path.resolve(currentDir, "mocks/expo-haptics.ts"),
          "expo-sensors": path.resolve(currentDir, "mocks/expo-sensors.ts"),
          "expo-symbols": path.resolve(currentDir, "mocks/expo-symbols.tsx"),
        },
      },
      optimizeDeps: {
        ...optimizeDeps,
        exclude: [...excluded],
      },
    } satisfies UserConfig;
  },
};
export default config;
