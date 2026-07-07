import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { LegoLoaderNative } from "./LegoLoaderNative";

const meta = {
  component: LegoLoaderNative,
  tags: ["ai-generated", "needs-work"],
  args: {
    message: "Looking up...",
  },
  render: (args) => (
    <View style={{ minHeight: 520, alignItems: "center", justifyContent: "center" }}>
      <LegoLoaderNative {...args} />
    </View>
  ),
} satisfies Meta<typeof LegoLoaderNative>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReadingSetNumber: Story = {
  args: {
    message: "Reading set number...",
  },
};

export const FindingMinifigures: Story = {
  args: {
    message: "Finding minifigures...",
  },
};
