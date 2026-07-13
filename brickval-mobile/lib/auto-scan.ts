export interface AutoScanTarget {
  trackingId: string;
  confidence: number;
  frameCoverage: number;
  fullyVisible: boolean;
}

export interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MinifigureObservation {
  confidence: number;
  boundingBox: NormalizedBoundingBox;
  timestamp: number;
  fullyVisible: boolean;
  regionId: string;
}

export type AutoScanBlockReason = "multiple" | "partial" | null;

const REQUIRED_CONSISTENT_OBSERVATIONS = 3;
const STABILITY_WINDOW_MS = 600;

export interface AutoScanSession {
  phase: "searching" | "detected" | "holding" | "capturing";
  captureRequested: boolean;
  target: AutoScanTarget | null;
  stableSince: number | null;
  consistentObservationCount: number;
  blockReason: AutoScanBlockReason;
  lastObservation: MinifigureObservation | null;
}

export function createAutoScanSession(): AutoScanSession {
  return {
    phase: "searching",
    captureRequested: false,
    target: null,
    stableSince: null,
    consistentObservationCount: 0,
    blockReason: null,
    lastObservation: null,
  };
}

export function observeAutoScanTarget(
  session: AutoScanSession,
  target: AutoScanTarget | null
): AutoScanSession {
  if (
    !target ||
    target.confidence < 0.8 ||
    target.frameCoverage < 0.15 ||
    target.frameCoverage > 0.75 ||
    !target.fullyVisible
  ) {
    return {
      ...session,
      phase: "searching",
      captureRequested: false,
      target: null,
      stableSince: null,
      consistentObservationCount: 0,
      blockReason: null,
      lastObservation: null,
    };
  }

  const consistentObservationCount =
    session.target?.trackingId === target.trackingId
      ? session.consistentObservationCount + 1
      : 1;

  return {
    phase:
      consistentObservationCount >= REQUIRED_CONSISTENT_OBSERVATIONS
        ? "detected"
        : "searching",
    captureRequested: false,
    target,
    stableSince: null,
    consistentObservationCount,
    blockReason: null,
    lastObservation: session.lastObservation,
  };
}

export function observeAutoScanFrame(
  session: AutoScanSession,
  observations: MinifigureObservation[]
): AutoScanSession {
  if (observations.length > 1) {
    return {
      ...createAutoScanSession(),
      blockReason: "multiple",
    };
  }

  const observation = observations[0];
  if (!observation) return createAutoScanSession();
  if (!observation.fullyVisible) {
    return {
      ...createAutoScanSession(),
      blockReason: "partial",
    };
  }

  const priorSession = session.lastObservation && observationsAreConsistent(session.lastObservation, observation)
    ? session
    : createAutoScanSession();
  const next = observeAutoScanTarget(priorSession, {
    trackingId: observation.regionId,
    confidence: observation.confidence,
    frameCoverage: observation.boundingBox.width * observation.boundingBox.height,
    fullyVisible: observation.fullyVisible,
  });
  return { ...next, lastObservation: observation };
}

function observationsAreConsistent(
  previous: MinifigureObservation,
  current: MinifigureObservation
): boolean {
  if (previous.regionId !== current.regionId) return false;
  const previousCenterX = previous.boundingBox.x + previous.boundingBox.width / 2;
  const previousCenterY = previous.boundingBox.y + previous.boundingBox.height / 2;
  const currentCenterX = current.boundingBox.x + current.boundingBox.width / 2;
  const currentCenterY = current.boundingBox.y + current.boundingBox.height / 2;
  const centerMovement = Math.hypot(currentCenterX - previousCenterX, currentCenterY - previousCenterY);
  const previousArea = previous.boundingBox.width * previous.boundingBox.height;
  const currentArea = current.boundingBox.width * current.boundingBox.height;
  const areaRatio = previousArea > 0 ? currentArea / previousArea : 0;
  return centerMovement <= 0.04 && areaRatio >= 0.75 && areaRatio <= 1.33;
}

export function observeAutoScanStability(
  session: AutoScanSession,
  observation: { now: number; deviceStable: boolean; targetStable: boolean }
): AutoScanSession {
  if (!session.target || !observation.deviceStable || !observation.targetStable) {
    return {
      ...session,
      phase: session.target ? "detected" : "searching",
      captureRequested: false,
      stableSince: null,
    };
  }

  const stableSince = session.stableSince ?? observation.now;
  const ready = observation.now - stableSince >= STABILITY_WINDOW_MS;
  return {
    ...session,
    phase: ready ? "capturing" : "holding",
    captureRequested: ready,
    stableSince,
  };
}
