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
    let saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72 });
    if (new File(saved.uri).size > TARGET_UPLOAD_BYTES) {
      saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.55 });
    }
    return saved.uri;
  } finally {
    context.release();
    rendered?.release();
  }
}
