# Roboflow smart scanner

The mobile app samples a stable camera scene at 416px, sends JPEGs below 100KB to BrickVal's backend, and never embeds the Roboflow API key. Two consistent detections at 0.75 confidence trigger a silent final capture. Brickognize still performs exact identification.

## Deployment

1. Apply `supabase/schema.sql` to the existing Supabase project.
2. Set the server-only `ROBOFLOW_API_KEY` environment variable in Vercel. Set `ROBOFLOW_SMART_SCAN_ENABLED=false` as the rollout kill switch when needed.
3. Keep `hostedSmartScanEnabled` enabled only for internal/TestFlight rollout until the 100-positive and 100-negative acceptance set passes.
4. Keep Roboflow paid overage disabled and verify hosted commercial-use permission before public launch.

The pinned detector is `lego-364li/1`: https://universe.roboflow.com/object-detection-3oawx/lego-364li

The server enforces a shared 30,000-inference monthly cap. If reached, the app safely disables cloud auto-scan while leaving gallery and bulk manual capture available.
