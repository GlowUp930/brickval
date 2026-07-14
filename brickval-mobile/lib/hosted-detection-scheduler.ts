export interface HostedDetectionSchedule {
  inFlight: boolean;
  attempts: number;
  lastRequestedAt: number | null;
}

export function createHostedDetectionSchedule(): HostedDetectionSchedule {
  return { inFlight: false, attempts: 0, lastRequestedAt: null };
}

export function shouldSampleHostedDetection(
  schedule: HostedDetectionSchedule,
  observation: { now: number; cameraStable: boolean }
): boolean {
  if (!observation.cameraStable || schedule.inFlight) return false;
  if (schedule.lastRequestedAt === null) return true;
  const interval = schedule.attempts >= 8 ? 2_000 : 800;
  return observation.now - schedule.lastRequestedAt >= interval;
}

export function startHostedDetection(
  schedule: HostedDetectionSchedule,
  now: number
): HostedDetectionSchedule {
  return {
    inFlight: true,
    attempts: schedule.attempts + 1,
    lastRequestedAt: now,
  };
}

export function completeHostedDetection(
  schedule: HostedDetectionSchedule
): HostedDetectionSchedule {
  return { ...schedule, inFlight: false };
}
