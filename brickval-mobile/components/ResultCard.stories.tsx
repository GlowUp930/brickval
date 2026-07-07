import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn, within, expect } from "storybook/test";
import type { LookupDetailResult } from "../lib/api";
import { ResultCard } from "./ResultCard";

const result: LookupDetailResult = {
  set_number: "coltlbm16",
  item_type: "minifig",
  name: "Catman",
  theme: "Collectible Minifigures",
  pieces: null,
  image_url: "https://img.bricklink.com/ItemImage/MN/0/coltlbm16.png",
  market_history: [],
  fig_info: { fig_number: "coltlbm16", year_released: 2017 },
  pricing: {
    hero_new_avg_usd: 8.83,
    rrp_usd: null,
    gain_pct: null,
    bricklink_new_qty: 8,
    data_source: "sold",
    used_sold_avg_usd: 6.18,
    used_sold_min_usd: 5.4,
    used_sold_max_usd: 7.12,
    used_sold_qty: 12,
    used_stock_avg_usd: 7.2,
    used_stock_qty: 3,
    new_sold_avg_usd: 8.83,
    new_sold_min_usd: 8.11,
    new_sold_max_usd: 9.76,
    new_sold_qty: 8,
    new_stock_avg_usd: 9.14,
    new_stock_qty: 5,
    sold_details: [
      { price_usd: 6.18, quantity: 1, date: "2026-06-29", country: "US" },
      { price_usd: 6.02, quantity: 1, date: "2026-06-18", country: "UK" },
    ],
    stock_details: [{ price_usd: 7.12, quantity: 1, country: "DE" }],
    sold_new_details: [
      { price_usd: 8.83, quantity: 1, date: "2026-06-30", country: "US" },
      { price_usd: 8.55, quantity: 1, date: "2026-06-11", country: "CA" },
    ],
    stock_new_details: [{ price_usd: 9.14, quantity: 1, country: "AU" }],
  },
};

const meta = {
  component: ResultCard,
  tags: ["ai-generated", "needs-work"],
  args: {
    result,
    onDismiss: fn(),
    onAddToCollection: fn(),
    addedToCollection: false,
    onViewDetails: fn(),
  },
} satisfies Meta<typeof ResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Minifig: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText(/catman/i)).toBeVisible();
    await expect(body.getByRole("button", { name: /add to collection/i })).toBeVisible();
  },
};

export const AddedState: Story = {
  args: {
    addedToCollection: true,
  },
};
