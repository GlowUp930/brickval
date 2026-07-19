import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { QuestionMarkPlaceholder } from "./QuestionMarkPlaceholder";

const meta = {
  component: QuestionMarkPlaceholder,
  tags: ["ai-generated", "needs-work"],
  render: () => (
    <View style={{ minHeight: 220, alignItems: "center", justifyContent: "center" }}>
      <QuestionMarkPlaceholder style={{ width: 120, height: 120, borderRadius: 20 }} />
    </View>
  ),
} satisfies Meta<typeof QuestionMarkPlaceholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
