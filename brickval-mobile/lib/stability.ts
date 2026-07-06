import { useCallback, useEffect, useRef, useState } from "react";
import { Accelerometer } from "expo-sensors";

/**
 * Detects when the device is being held still — the cue that the user has
 * "framed" a target and is ready to capture. Pure on-device, zero API cost.
 *
 * Strategy: subscribe to accelerometer at 16Hz, compute the magnitude delta
 * from gravity (1g). When the delta stays under STILL_THRESHOLD for
 * STABILITY_WINDOW_MS continuously, fire onStable() exactly once.
 *
 * After firing, the hook enters a cooldown until reset() is called.
 */

const STILL_THRESHOLD = 0.05; // g
const STABILITY_WINDOW_MS = 800;
const SAMPLE_INTERVAL_MS = 60;

export function useStabilityDetector(
  enabled: boolean,
  onStable: () => void
): { reset: () => void; pulse: number } {
  const [pulse, setPulse] = useState(0); // 0..1, how close we are to firing
  const stableSinceRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const onStableRef = useRef(onStable);
  onStableRef.current = onStable;

  const reset = useCallback(() => {
    stableSinceRef.current = null;
    firedRef.current = false;
    setPulse(0);
  }, []);

  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (firedRef.current) return;

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(magnitude - 1);
      const now = Date.now();

      if (delta < STILL_THRESHOLD) {
        if (stableSinceRef.current === null) {
          stableSinceRef.current = now;
        }
        const heldFor = now - stableSinceRef.current;
        const ratio = Math.min(1, heldFor / STABILITY_WINDOW_MS);
        setPulse(ratio);

        if (heldFor >= STABILITY_WINDOW_MS) {
          firedRef.current = true;
          onStableRef.current();
        }
      } else {
        stableSinceRef.current = null;
        setPulse(0);
      }
    });

    return () => {
      sub.remove();
    };
  }, [enabled]);

  return { reset, pulse };
}
