import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — checked at call time, not at build time.
// Server-side only. Never import from client components.
let _anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  // Use BRICKVAL_ANTHROPIC_API_KEY to avoid clash with Claude Code shell env
  const key = process.env.BRICKVAL_ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("Missing env var: BRICKVAL_ANTHROPIC_API_KEY");
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: key });
  }
  return _anthropic;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return (getAnthropic() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
