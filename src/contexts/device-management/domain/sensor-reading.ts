export type SensorReading = {
  deviceId: string;
  soilMoisturePct: number;
  temperatureC: number;
  flowRateLMin?: number;
  batteryPct?: number;
  recordedAt: string;
};

export const normalizeReading = (reading: SensorReading): SensorReading => {
  return {
    ...reading,
    soilMoisturePct: clamp(reading.soilMoisturePct, 0, 100),
    batteryPct:
      reading.batteryPct === undefined
        ? undefined
        : Math.round(clamp(reading.batteryPct, 0, 100)),
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
