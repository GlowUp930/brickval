import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import type { LookupDetailResult } from "../lib/api";
import { DetectionOverlay } from "./DetectionOverlay";

const catman: LookupDetailResult = {
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
    used_sold_min_usd: 5.5,
    used_sold_max_usd: 6.9,
    used_sold_qty: 6,
    used_stock_avg_usd: 6.8,
    used_stock_qty: 2,
    new_sold_avg_usd: 8.83,
    new_sold_min_usd: 8.1,
    new_sold_max_usd: 9.4,
    new_sold_qty: 8,
    new_stock_avg_usd: 9.1,
    new_stock_qty: 4,
    sold_details: [],
    stock_details: [],
    sold_new_details: [],
    stock_new_details: [],
  },
};

const meta = {
  component: DetectionOverlay,
  tags: ["ai-generated", "needs-work"],
  render: (args) => (
    <View style={{ width: 390, height: 520, backgroundColor: "#17181C", borderRadius: 28, overflow: "hidden" }}>
      <DetectionOverlay {...args} />
    </View>
  ),
  args: {
    imageWidth: 390,
    imageHeight: 520,
    detections: [
      {
        detection: {
          id: "coltlbm16",
          item_type: "minifig",
          score: 0.91,
          bounding_box: { left: 98, top: 110, right: 228, bottom: 360, imageWidth: 390, imageHeight: 520 },
        },
        result: catman,
      },
      {
        detection: {
          id: "sw0001",
          item_type: "minifig",
          score: 0.62,
          bounding_box: { left: 240, top: 140, right: 338, bottom: 348, imageWidth: 390, imageHeight: 520 },
        },
        result: null,
      },
    ],
  },
} satisfies Meta<typeof DetectionOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ContainMode: Story = {
  args: {
    resizeMode: "contain",
  },
};
