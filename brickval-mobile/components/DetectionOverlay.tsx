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

const ACCENT = "#F2CD37";
const INK = "#101012";
const LIGHT = "#FFF9D8";
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

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

          const label = priced.result?.name ?? `#${priced.detection.id}`;
          const shortLabel = shorten(label, 18);
          const price = priced.result?.pricing?.hero_new_avg_usd ?? null;
          const priceText = price !== null ? USD.format(price) : priced.detection.score < 0.72 ? "Possible" : "Match";
          const bubbleWidth = Math.min(168, Math.max(96, shortLabel.length * 6.2 + 30, priceText.length * 8.8 + 26));
          const bubbleHeight = 44;
          const boxX = offsetX + box.left * scale;
          const boxY = offsetY + box.top * scale;
          const boxWidth = (box.right - box.left) * scale;
          const boxHeight = (box.bottom - box.top) * scale;
          const bubbleX = clamp(boxX + boxWidth / 2 - bubbleWidth / 2, 8, imageWidth - bubbleWidth - 8);
          const preferredBubbleY = boxY > bubbleHeight + 14 ? boxY - bubbleHeight - 8 : boxY + boxHeight + 8;

          return {
            id: priced.detection.id,
            x: boxX,
            y: boxY,
            width: boxWidth,
            height: boxHeight,
            score: priced.detection.score,
            bubbleX,
            bubbleY: clamp(preferredBubbleY, 8, imageHeight - bubbleHeight - 8),
            bubbleWidth,
            bubbleHeight,
            label: shortLabel,
            priceText,
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
              fill="rgba(242,205,55,0.08)"
              stroke={ACCENT}
              strokeWidth={3}
              strokeDasharray={box.score < 0.72 ? "7 5" : undefined}
              rx={10}
              opacity={0.96}
            />
            <Rect
              x={box.bubbleX}
              y={box.bubbleY}
              width={box.bubbleWidth}
              height={box.bubbleHeight}
              fill={box.score < 0.72 ? LIGHT : ACCENT}
              rx={16}
              opacity={0.98}
            />
            <SvgText
              x={box.bubbleX + box.bubbleWidth / 2}
              y={box.bubbleY + 18}
              fill={INK}
              fontSize={10}
              fontWeight="900"
              textAnchor="middle"
            >
              {box.label}
            </SvgText>
            <SvgText
              x={box.bubbleX + box.bubbleWidth / 2}
              y={box.bubbleY + 35}
              fill={INK}
              fontSize={15}
              fontWeight="900"
              textAnchor="middle"
            >
              {box.priceText}
            </SvgText>
            {box.score < 0.72 ? (
              <SvgText
                x={box.x + 10}
                y={box.y + 18}
                fill={LIGHT}
                fontSize={10}
                fontWeight="900"
              >
                Tap to confirm
              </SvgText>
            ) : null}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
