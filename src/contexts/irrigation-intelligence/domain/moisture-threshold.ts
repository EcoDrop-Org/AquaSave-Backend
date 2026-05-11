import { badRequest } from '../../../shared/http/http-error.js';

export type MoistureThreshold = {
  minMoisture: number;
  optimalMoisture: number;
  maxMoisture: number;
  cropType: string;
};

export const defaultMoistureThreshold: MoistureThreshold = {
  minMoisture: 35,
  optimalMoisture: 60,
  maxMoisture: 80,
  cropType: 'Hortalizas',
};

export const validateMoistureThreshold = (
  threshold: MoistureThreshold,
): MoistureThreshold => {
  if (
    threshold.minMoisture < 0 ||
    threshold.optimalMoisture < 0 ||
    threshold.maxMoisture < 0 ||
    threshold.minMoisture > 100 ||
    threshold.optimalMoisture > 100 ||
    threshold.maxMoisture > 100
  ) {
    throw badRequest('Moisture thresholds must be between 0 and 100');
  }

  if (
    threshold.minMoisture >= threshold.optimalMoisture ||
    threshold.optimalMoisture >= threshold.maxMoisture
  ) {
    throw badRequest('Moisture thresholds must follow min < optimal < max');
  }

  return threshold;
};
