import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

import {
  getDetectionSamplePlan,
  type DetectionSampleMode,
  type DetectionSamplePlan,
} from "./scan-image";

const MAX_SAMPLE_BYTES = 100 * 1024;

export async function prepareHostedDetectionSample(
  photoUri: string,
  mode: DetectionSampleMode
): Promise<{ uri: string; plan: DetectionSamplePlan }> {
  const dimensions = await Image.getSize(photoUri);
  const plan = getDetectionSamplePlan(dimensions.width, dimensions.height, mode);
  const context = ImageManipulator.manipulate(photoUri);
  let rendered: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
  try {
    if (plan.crop) context.crop(plan.crop);
    context.resize(plan.resize);
    rendered = await context.renderAsync();
    for (const compress of [0.45, 0.28, 0.16]) {
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress });
      if (new File(saved.uri).size <= MAX_SAMPLE_BYTES) return { uri: saved.uri, plan };
    }
    throw new Error("Detection sample remains above 100KB");
  } finally {
    context.release();
    rendered?.release();
  }
}
