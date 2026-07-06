import * as React from "react";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import type { IdentificationDetection, LookupDetailResult } from "../lib/api";

interface PricedDetection {
  detection: IdentificationDetection;
  result: LookupDetailResult | null;
}

interface Props {
  detections: PricedDetection[];
  imageWidth: number;
  imageHeight: number;
  resizeMode?: "contain" | "cover";
}

const ACCENT = "#02C400";
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function DetectionOverlay({ detections, imageWidth, imageHeight, resizeMode = "contain" }: Props) {
  const boxes = useMemo(
    () =>
      detections
        .filter((d) => d.detection.bounding_box && d.detection.bounding_box.imageWidth > 0)
        .map((priced) => {
          const box = priced.detection.bounding_box!;
          const scaleX = imageWidth / box.imageWidth;
          const scaleY = imageHeight / box.imageHeight;
          const scale = resizeMode === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
          const renderedWidth = box.imageWidth * scale;
          const renderedHeight = box.imageHeight * scale;
          const offsetX = (imageWidth - renderedWidth) / 2;
          const offsetY = (imageHeight - renderedHeight) / 2;

          return {
            id: priced.detection.id,
            x: offsetX + box.left * scale,
            y: offsetY + box.top * scale,
            width: (box.right - box.left) * scale,
            height: (box.bottom - box.top) * scale,
            score: priced.detection.score,
            label: priced.result?.name ?? `#${priced.detection.id}`,
            price: priced.result?.pricing?.hero_new_avg_usd ?? null,
          };
        }),
    [detections, imageWidth, imageHeight, resizeMode]
  );

  if (boxes.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Svg
        width={imageWidth}
        height={imageHeight}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      >
        {boxes.map((box) => (
          <React.Fragment key={box.id}>
            <Rect
              x={box.x}
              y={box.y}
              width={Math.max(1, box.width)}
              height={Math.max(1, box.height)}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2.5}
              rx={4}
              opacity={0.88}
            />
            {box.price !== null ? (
              <SvgText
                x={box.x + box.width / 2}
                y={box.y - 9}
                fill={ACCENT}
                fontSize={12}
                fontWeight="900"
                textAnchor="middle"
              >
                {USD.format(box.price)}
              </SvgText>
            ) : (
              <SvgText
                x={box.x + 8}
                y={box.y - 9}
                fill="rgba(255,255,255,0.9)"
                fontSize={10}
                fontWeight="800"
              >
                {box.label.length > 14 ? `${box.label.slice(0, 14)}...` : box.label}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
