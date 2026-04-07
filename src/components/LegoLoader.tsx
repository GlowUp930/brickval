"use client";

import { motion } from "framer-motion";

/**
 * Full-screen LEGO-themed loading overlay.
 * Bricks drop in from above and stack neatly to build a tower.
 * Tower then fades out and rebuilds in a continuous loop.
 */

// Ordered bottom → top. Each layer alternates width/offset for realistic
// interlocking brick look. x is centered around 0; width in "pixels".
const LAYERS = [
  { color: "#f5c518", width: 80, x: 0 },       // gold 4x1 (base)
  { color: "#e74c3c", width: 64, x: -8 },      // red 3x1
  { color: "#3498db", width: 64, x: 8 },       // blue 3x1
  { color: "#2ecc71", width: 48, x: -16 },     // green 2x1
  { color: "#f39c12", width: 48, x: 0 },       // orange 2x1
];

const BRICK_HEIGHT = 18;       // visible brick body height
const STUD_HEIGHT = 5;         // studs sitting on top
const LAYER_OFFSET = BRICK_HEIGHT; // bricks sit body-to-body; studs nest into layer above

const STAGGER = 0.18;          // delay between each brick
const DROP_DURATION = 0.45;
const HOLD_DURATION = 0.8;     // time the completed tower stays visible
const TOTAL_BUILD = LAYERS.length * STAGGER + DROP_DURATION;
const CYCLE = TOTAL_BUILD + HOLD_DURATION;

function StackedBrick({
  color,
  width,
  x,
  layerIndex,
}: {
  color: string;
  width: number;
  x: number;
  layerIndex: number;
}) {
  // Final resting Y: bottom of container = 0, each layer goes up
  // layer 0 (base) sits at bottom, layer N sits at N * LAYER_OFFSET above
  const finalY = -(layerIndex * LAYER_OFFSET);
  const studCount = Math.round(width / 16); // roughly 1 stud per 16px

  const dropDelay = layerIndex * STAGGER;

  return (
    <motion.div
      initial={{ y: -160, opacity: 0 }}
      animate={{
        y: [-160, finalY, finalY, -160],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: CYCLE,
        times: [
          0,
          (dropDelay + DROP_DURATION) / CYCLE,
          (TOTAL_BUILD + HOLD_DURATION * 0.6) / CYCLE,
          1,
        ],
        ease: ["easeIn", "linear", "easeOut"],
        repeat: Infinity,
        repeatDelay: 0.3,
      }}
      className="absolute"
      style={{
        bottom: 0,
        left: "50%",
        marginLeft: x - width / 2,
      }}
    >
      <svg
        width={width}
        height={BRICK_HEIGHT + STUD_HEIGHT}
        viewBox={`0 0 ${width} ${BRICK_HEIGHT + STUD_HEIGHT}`}
        fill="none"
      >
        {/* Studs on top */}
        {Array.from({ length: studCount }).map((_, i) => {
          const spacing = width / studCount;
          const cx = spacing * i + spacing / 2;
          return (
            <g key={i}>
              <rect
                x={cx - 3.5}
                y={0}
                width="7"
                height={STUD_HEIGHT}
                rx="1"
                fill={color}
              />
              <ellipse
                cx={cx}
                cy={0.5}
                rx="3.5"
                ry="1.3"
                fill="rgba(255,255,255,0.25)"
              />
              <ellipse
                cx={cx}
                cy={0.5}
                rx="3.5"
                ry="1.3"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="0.5"
              />
            </g>
          );
        })}

        {/* Brick body */}
        <rect
          x="0"
          y={STUD_HEIGHT}
          width={width}
          height={BRICK_HEIGHT}
          rx="2"
          fill={color}
        />
        {/* Top highlight */}
        <rect
          x="0"
          y={STUD_HEIGHT}
          width={width}
          height="1.5"
          rx="0.75"
          fill="rgba(255,255,255,0.3)"
        />
        {/* Bottom shadow */}
        <rect
          x="0"
          y={STUD_HEIGHT + BRICK_HEIGHT - 2}
          width={width}
          height="2"
          rx="1"
          fill="rgba(0,0,0,0.18)"
        />
        {/* Left edge highlight */}
        <rect
          x="0"
          y={STUD_HEIGHT}
          width="1"
          height={BRICK_HEIGHT}
          fill="rgba(255,255,255,0.15)"
        />
        {/* Right edge shadow */}
        <rect
          x={width - 1}
          y={STUD_HEIGHT}
          width="1"
          height={BRICK_HEIGHT}
          fill="rgba(0,0,0,0.1)"
        />
      </svg>
    </motion.div>
  );
}

interface LegoLoaderProps {
  message?: string;
}

export function LegoLoader({ message = "Looking up..." }: LegoLoaderProps) {
  // Container height = all layers stacked + room for studs at top
  const towerHeight = LAYERS.length * LAYER_OFFSET + STUD_HEIGHT;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "rgba(13,13,15,0.92)", backdropFilter: "blur(8px)" }}
    >
      {/* Stacking tower */}
      <div
        className="relative mb-10"
        style={{ width: 120, height: towerHeight + 20 }}
      >
        {/* Ground shadow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] rounded-full blur-md"
          style={{
            width: 90,
            height: 10,
            background: "rgba(245,197,24,0.25)",
          }}
        />
        {LAYERS.map((layer, i) => (
          <StackedBrick
            key={i}
            color={layer.color}
            width={layer.width}
            x={layer.x}
            layerIndex={i}
          />
        ))}
      </div>

      {/* Pulsing message */}
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-base font-bold"
        style={{ color: "var(--foreground)" }}
      >
        {message}
      </motion.p>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        Fetching real market data...
      </p>
    </motion.div>
  );
}
