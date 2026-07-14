export type ScanFeedbackOutcome =
  | "matched"
  | "brickognize-rejected"
  | "gallery-recovery"
  | "low-confidence";

export function planFeedbackImageCollection(input: {
  consent: boolean;
  outcome: ScanFeedbackOutcome;
  random: number;
}): boolean {
  if (!input.consent) return false;
  if (input.outcome !== "matched") return true;
  return input.random < 0.05;
}
