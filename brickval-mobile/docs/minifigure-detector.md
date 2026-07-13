# Minifigure detector integration

The scanner consumes a native Nitro Hybrid Object named `MinifigureDetector` through `lib/minifigure-detector.ts`.

The native implementation must:

- bundle an int8 LiteRT one-class detector;
- accept VisionCamera RGB frames and run synchronously on the camera frame thread;
- return normalized bounding boxes, confidence, full-visibility state, and a stable physical `regionId`;
- support standard humanoid minifigures, helmets, capes, wings, skirts, and handheld accessories;
- exclude droids, bigfigs, animals, and microfigures from v1;
- drop work while inference is busy rather than queue frames.

The JavaScript camera pipeline processes at most eight frames per second and remains disabled unless the native object reports `isReady`. This is intentional: a missing or invalid model can never trigger an automatic photo.

No trained model or licensed training dataset exists in this repository. Do not replace the detector with simulated observations or a generic object detector. Add the production model only after its image provenance is documented and the acceptance dataset passes:

- zero captures across 100 negative scenes;
- at least 98% auto-capture precision;
- at least 90% presence recall;
- at least 90% physical-region recall for 40-figure bulk layouts.
