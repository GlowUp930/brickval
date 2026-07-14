import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";
import type { NormalizedBoundingBox } from "./auto-scan";
import { planMinifigureCrop } from "./scan-crop-plan";

const TARGET_UPLOAD_BYTES = 500 * 1024;

export async function prepareMinifigureCapture(
  photoUri: string,
  boundingBox: NormalizedBoundingBox
): Promise<string> {
  const dimensions = await Image.getSize(photoUri);
  const plan = planMinifigureCrop(boundingBox, dimensions);
  const context = ImageManipulator.manipulate(photoUri);
  let rendered: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
  try {
    context.crop(plan.crop);
    if (plan.resize) context.resize(plan.resize);
    rendered = await context.renderAsync();
    for (const compress of [0.72, 0.55, 0.38, 0.24]) {
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress });
      if (new File(saved.uri).size <= TARGET_UPLOAD_BYTES) return saved.uri;
    }
    throw new Error("Minifigure capture remains above 500KB");
  } finally {
    context.release();
    rendered?.release();
  }
}
