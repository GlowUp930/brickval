import type { Preview } from "@storybook/react-native-web-vite";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initialize, mswLoader } from "msw-storybook-addon";
import { ThemeProvider } from "../lib/ThemeProvider";
import { mswHandlers } from "./msw-handlers";

initialize({ onUnhandledRequest: "bypass" });

const preview: Preview = {
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <ThemeProvider initial="dark">
          <View style={{ flex: 1, minHeight: 720, backgroundColor: "#0E0F11", padding: 16 }}>
            <Story />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    ),
  ],
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
    msw: {
      handlers: mswHandlers,
    },
  },
  async beforeEach() {
    localStorage.setItem("brickval_theme_preference", "dark");
  },
};

export default preview;
