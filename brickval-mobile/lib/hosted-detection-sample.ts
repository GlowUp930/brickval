import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

import { getDetectionSampleResize } from "./scan-image";

const MAX_SAMPLE_BYTES = 100 * 1024;

export async function prepareHostedDetectionSample(photoUri: string): Promise<string> {
  const dimensions = await Image.getSize(photoUri);
  const context = ImageManipulator.manipulate(photoUri);
  let rendered: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
  try {
    context.resize(getDetectionSampleResize(dimensions.width, dimensions.height));
    rendered = await context.renderAsync();
    for (const compress of [0.45, 0.28, 0.16]) {
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress });
      if (new File(saved.uri).size <= MAX_SAMPLE_BYTES) return saved.uri;
    }
    throw new Error("Detection sample remains above 100KB");
  } finally {
    context.release();
    rendered?.release();
  }
}
