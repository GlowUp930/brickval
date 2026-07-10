import { forwardRef } from "react";
import { View } from "react-native";

type CameraPermission = { granted: boolean; requestPermission: () => Promise<void> };

export const CameraView = forwardRef(function CameraViewMock(props: any, ref: any) {
  if (ref && typeof ref === "object") {
    ref.current = {
      takePictureAsync: async () => ({ uri: "storybook://camera.jpg" }),
      pausePreview: async () => {},
      resumePreview: async () => {},
    };
  }

  return <View {...props} />;
});

export function useCameraPermissions(): [CameraPermission | null, () => Promise<void>] {
  return [
    { granted: true, requestPermission: async () => {} },
    async () => {},
  ];
}
