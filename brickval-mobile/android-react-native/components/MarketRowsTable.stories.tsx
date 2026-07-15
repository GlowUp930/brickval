import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { expect } from "storybook/test";
import { colors, getThemeColors } from "../lib/theme";
import { MarketRowsTable } from "./MarketRowsTable";

const rows = [
  { id: "1", label: "BrickLink sold", meta: "Jul 1 · US", priceUsd: 8.83 },
  { id: "2", label: "BrickLink sold", meta: "Jun 28 · UK", priceUsd: 8.12 },
  { id: "3", label: "BrickLink listing", meta: "DE · qty 1", priceUsd: 9.41 },
  { id: "4", label: "eBay market", meta: "Jun 23 · eBay AU", priceUsd: 8.67 },
  { id: "5", label: "BrickLink sold", meta: "Jun 19 · CA", priceUsd: 7.91 },
  { id: "6", label: "BrickLink listing", meta: "US · qty 2", priceUsd: 9.02 },
];

const meta = {
  component: MarketRowsTable,
  tags: ["ai-generated", "needs-work"],
  args: {
    rows,
    colors,
    activeColors: getThemeColors("dark"),
  },
} satisfies Meta<typeof MarketRowsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    rows: [],
  },
};

export const Expandable: Story = {
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: /expand market rows/i });
    await userEvent.click(button);
    await expect(canvas.getByText(/show fewer rows/i)).toBeVisible();
  },
};
