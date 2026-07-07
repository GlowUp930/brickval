import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { expect } from "storybook/test";
import { ScanIntentPicker } from "./ScanIntentPicker";

const meta = {
  component: ScanIntentPicker,
  tags: ["ai-generated", "needs-work"],
  args: {
    value: "single",
    onChange: () => {},
  },
  render: (args) => (
    <View style={{ minHeight: 140, alignItems: "center", justifyContent: "center" }}>
      <ScanIntentPicker {...args} />
    </View>
  ),
} satisfies Meta<typeof ScanIntentPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

export const Bulk: Story = {
  args: {
    value: "bulk",
  },
};

export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /scan one minifigure/i });
    await expect(getComputedStyle(button).backgroundColor).toBe("rgb(242, 205, 55)");
  },
};
