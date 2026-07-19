import { View, Text, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { expect, fn } from "storybook/test";
import { CameraScanner } from "./CameraScanner";

const meta = {
  component: CameraScanner,
  tags: ["ai-generated"],
  args: {
    enabled: true,
    autoCaptureEnabled: true,
    scanIntent: "single",
    permissionGranted: true,
    cameraPreview: <MockCameraPreview />,
    onCapture: fn(),
    onPhotoPress: fn(),
  },
  render: (args) => (
    <View style={styles.phone}>
      <CameraScanner {...args} />
    </View>
  ),
} satisfies Meta<typeof CameraScanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleIdle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Scanning...")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /capture lego photo/i })).toBeNull();
  },
};

export const SingleHoldSteady: Story = {
  args: {
    autoScanPreviewState: "holdSteady",
  },
};

export const SingleProcessing: Story = {
  args: {
    enabled: false,
    autoScanPreviewState: "processing",
  },
};

export const BulkManualCapture: Story = {
  args: {
    scanIntent: "bulk",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /capture lego photo/i })).toBeVisible();
  },
};

function MockCameraPreview() {
  return (
    <View style={styles.preview}>
      <View style={styles.tableGlow} />
      <View style={[styles.figure, styles.figureMain]}>
        <View style={styles.head} />
        <View style={styles.body} />
        <View style={styles.legs} />
      </View>
      <View style={[styles.figure, styles.figureSoft]}>
        <View style={styles.headSmall} />
        <View style={styles.bodySmall} />
      </View>
      <Text style={styles.previewLabel}>Live camera preview</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: 390,
    height: 760,
    position: "relative",
    overflow: "hidden",
    borderRadius: 34,
    backgroundColor: "#101012",
    alignSelf: "center",
  },
  preview: {
    flex: 1,
    backgroundColor: "#171512",
  },
  tableGlow: {
    position: "absolute",
    left: -80,
    right: -80,
    top: 110,
    height: 460,
    transform: [{ rotate: "-13deg" }],
    backgroundColor: "rgba(242,205,55,0.13)",
  },
  figure: {
    position: "absolute",
    alignItems: "center",
  },
  figureMain: {
    top: 236,
    left: 136,
  },
  figureSoft: {
    top: 188,
    right: 62,
    opacity: 0.36,
    transform: [{ rotate: "18deg" }],
  },
  head: {
    width: 62,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F2CD37",
    borderWidth: 3,
    borderColor: "#111",
  },
  body: {
    width: 112,
    height: 128,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: "#B91C1C",
    borderWidth: 4,
    borderColor: "#111",
  },
  legs: {
    width: 98,
    height: 88,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "#1D4ED8",
    borderWidth: 4,
    borderColor: "#111",
  },
  headSmall: {
    width: 40,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F2CD37",
  },
  bodySmall: {
    width: 70,
    height: 80,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: "#111827",
  },
  previewLabel: {
    position: "absolute",
    left: 24,
    top: 92,
    color: "rgba(247,244,234,0.58)",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
