import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { expect, fn } from "storybook/test";
import { TopBar } from "./TopBar";

const meta = {
  component: TopBar,
  tags: ["ai-generated", "needs-work"],
  args: {
    onAccountPress: fn(),
  },
  render: (args) => (
    <View style={{ minHeight: 120, position: "relative", backgroundColor: "#0E0F11" }}>
      <TopBar {...args} />
    </View>
  ),
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole("button", { name: /account/i });
    await userEvent.click(button);
    await expect(args.onAccountPress).toHaveBeenCalled();
  },
};
