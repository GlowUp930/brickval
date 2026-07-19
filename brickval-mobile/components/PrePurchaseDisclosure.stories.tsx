import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { expect, fn, within } from "storybook/test";
import { PrePurchaseDisclosure } from "./PrePurchaseDisclosure";

const meta = {
  component: PrePurchaseDisclosure,
  tags: ["ai-generated", "needs-work"],
  args: {
    visible: true,
    onContinue: fn(),
    onDismiss: fn(),
  },
} satisfies Meta<typeof PrePurchaseDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText(/brickval pro/i)).toBeVisible();
    await expect(body.getByRole("button", { name: /continue to subscribe/i })).toBeVisible();
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
  },
};
