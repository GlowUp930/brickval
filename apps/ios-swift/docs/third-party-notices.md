# Third-Party Data Notices

## BrickVal Minifigure Detector v3

BrickVal's `MinifigureDetector.mlmodel` was trained with Apple Create ML from
BrickVal camera images and a modified public dataset:

- Dataset: LEGO, version 1 (2023-07-23)
- Creator: Roboflow Universe user in workspace `object-detection-3oawx`
- Source: https://universe.roboflow.com/object-detection-3oawx/lego-364li/dataset/1
- License: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/

BrickVal converted the annotations to Create ML format, filtered them to one
generic detection class, and supplemented them with manually reviewed BrickVal
camera images. The model detects minifigure locations only; it does not identify
individual minifigures.

Model SHA-256:
`57e546f7f6c018205db2b32834f86e6cd7e84d14cd91f18d2b9f634b7ce40f43`
