# Roboflow smart scanner

The mobile app samples a stable camera scene at 416px, sends JPEGs below 100KB to BrickVal's backend, and never embeds the Roboflow API key. Two consistent detections at 0.75 confidence trigger a silent final capture. Brickognize still performs exact identification.

## Deployment

1. Apply `supabase/schema.sql` to the existing Supabase project.
2. Set the server-only `ROBOFLOW_API_KEY` environment variable in Vercel. Set `ROBOFLOW_MINIFIGURE_MODEL` and `ROBOFLOW_MINIFIGURE_CLASSES` when using a custom trained detector. Set `ROBOFLOW_SMART_SCAN_ENABLED=false` as the rollout kill switch when needed.
3. Keep `hostedSmartScanEnabled` enabled only for internal/TestFlight rollout until the 100-positive and 100-negative acceptance set passes.
4. Keep Roboflow paid overage disabled and verify hosted commercial-use permission before public launch.

The production detector can be switched through Vercel environment variables. The default detector is `lego-minifigures-r3zzt/1`, published by VC under CC BY 4.0: https://universe.roboflow.com/vc-echpj/lego-minifigures-r3zzt

The `lego-364li` dataset was forked and trained in Roboflow as `garys-workspace-pqkfc/lego-364li-lqtm9-1-yolov8s-t1`. The run reached strong validation metrics, but live smoke tests returned no observations for two real phone minifigure photos, so it should not be enabled in production until its inference behavior is verified.

The server enforces a shared 30,000-inference monthly cap. If reached, the app safely disables cloud auto-scan while leaving gallery and bulk manual capture available.
