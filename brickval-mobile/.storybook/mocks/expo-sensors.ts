type AccelerometerSample = { x: number; y: number; z: number };

export const Accelerometer = {
  setUpdateInterval: () => {},
  addListener: (_listener: (sample: AccelerometerSample) => void) => ({
    remove: () => {},
  }),
};
