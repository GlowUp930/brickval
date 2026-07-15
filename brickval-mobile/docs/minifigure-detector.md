# Smart minifigure detector

BrickVal uses two separate services because detection and identification solve different problems.

```text
Camera → POST /api/minifig/detect → minifigure position
       → stable, framed capture
       → POST /api/minifig/scan → exact Brickognize identity + valuation
```

## Security and model control

- Roboflow credentials are server-only.
- The model, allowed classes, inference host, and kill switch are controlled through backend environment variables.
- The current public fallback is `lego-minifigures-r3zzt/1` (`Lego-Minifigures`).
- The custom candidate `garys-workspace-pqkfc/lego-364li-lqtm9-1-yolov8s-t1` remains TestFlight-only until real-camera acceptance passes.
- The old LiteRT/Nitro proposal is superseded. This repository has no validated, licensed bundled model, so an offline Core ML detector is a separate training and licensing project.

## Client acceptance rules

- Send a 416-pixel JPEG under 100 KB every 800 ms while stable; slow to 2 seconds after eight attempts.
- Use a centre-square sample for one minifigure and the full frame for bulk scanning.
- Require confidence ≥ 0.75, coverage from 15% through 75%, full visibility, two consistent observations, and about 600 ms stability.
- On quota, kill-switch, rate-limit, network, or detector failure, stop polling and retain manual capture, gallery, and review flows.

## Production gate

Validate 100 positive and 100 negative real-camera scenes before enabling the custom detector publicly. Record the model version, latency, confidence, and consented outcome feedback; never send scan images to Sentry.
