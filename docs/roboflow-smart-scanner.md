# Roboflow smart scanner

The mobile app samples a stable camera scene at 416px, sends JPEGs below 100KB to BrickVal's backend, and never embeds the Roboflow API key. Single scans use a center-square sample so a minifigure remains large enough for detection; returned boxes are mapped back to the full camera frame. Bulk scans preserve the complete frame. Two consistent detections at 0.75 confidence trigger a silent final capture. Brickognize still performs exact identification.

## Deployment

1. Apply `supabase/schema.sql` to the existing Supabase project.
2. Set the server-only `ROBOFLOW_API_KEY` environment variable in Vercel. Set `ROBOFLOW_MINIFIGURE_MODEL`, `ROBOFLOW_MINIFIGURE_CLASSES`, and `ROBOFLOW_INFERENCE_BASE_URL=https://serverless.roboflow.com` when using the custom trained detector. Set `ROBOFLOW_SMART_SCAN_ENABLED=false` as the rollout kill switch when needed. The default public detector stays on the faster legacy host.
3. Keep `hostedSmartScanEnabled` enabled only for internal/TestFlight rollout until the 100-positive and 100-negative acceptance set passes.
4. Keep Roboflow paid overage disabled and verify hosted commercial-use permission before public launch.

The production detector can be switched through Vercel environment variables. The default detector is `lego-minifigures-r3zzt/1`, published by VC under CC BY 4.0: https://universe.roboflow.com/vc-echpj/lego-minifigures-r3zzt

The `lego-364li` dataset was forked and trained in Roboflow as `garys-workspace-pqkfc/lego-364li-lqtm9-1-yolov8s-t1`. This is a newer Serverless Hosted API model ID, so it must use `https://serverless.roboflow.com`, not the legacy detect host.

The run reached 95.5% mAP@50, 96.6% precision and 93.2% recall. On two full-height 416px phone screenshots it scored only 30.5% and 9.2% because the figures became too small. Center-square 416px samples of the same scenes scored 90.3% and 95.0%. Keep the custom model in Preview/TestFlight until the required 100-positive and 100-negative real-camera acceptance set passes.

The server enforces a shared 30,000-inference monthly cap. If reached, the app safely disables cloud auto-scan while leaving gallery and bulk manual capture available.
