export type SensorReading = {
  deviceId: string;
  soilMoisturePct: number;
  temperatureC: number;
  /** Humedad relativa del aire (DHT11/DHT22), opcional. */
  humidityPct?: number;
  /** Estado de la bomba reportado por el dispositivo. */
  pumpOn?: boolean;
  flowRateLMin?: number;
  batteryPct?: number;
  recordedAt: string;
};

export const normalizeReading = (reading: SensorReading): SensorReading => {
  return {
    ...reading,
    soilMoisturePct: clamp(reading.soilMoisturePct, 0, 100),
    humidityPct:
      reading.humidityPct === undefined
        ? undefined
        : clamp(reading.humidityPct, 0, 100),
    batteryPct:
      reading.batteryPct === undefined
        ? undefined
        : Math.round(clamp(reading.batteryPct, 0, 100)),
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
