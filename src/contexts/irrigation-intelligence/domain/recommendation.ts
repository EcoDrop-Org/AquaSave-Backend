import type { Device } from '../../device-management/domain/device.js';
import {
  speciesById,
  soilTargetPct,
  type PlantSpecies,
} from '../../device-management/domain/plant-species.js';
import type { ProfileType } from '../../identity-access/domain/profile-type.js';
import { shouldPauseForWeather } from './weather-forecast.js';
import type { WeatherForecast } from './weather-forecast.js';

/** Urgencia de la recomendacion de riego. */
export type RecommendationLevel = 'ok' | 'watch' | 'act';

export type IrrigationAdvice = {
  level: RecommendationLevel;
  title: string;
  /** Texto ya redactado para mostrar en la tarjeta. */
  body: string;
  /** Por que se llego a esa conclusion (datos concretos). */
  reason: string;
  source: 'rules' | 'ai';
};

export type CareTip = {
  icon: 'sun' | 'water' | 'bug' | 'leaf';
  title: string;
  body: string;
};

export type Recommendation = {
  deviceId: string;
  speciesId: string;
  speciesName: string;
  irrigation: IrrigationAdvice;
  care: { tips: CareTip[]; source: 'rules' | 'ai' };
  info?: { description?: string; imageUrl?: string };
  generatedAt: string;
  validUntil: string;
};

/**
 * Motor de reglas: decide el riego con humedad del suelo, umbrales de la
 * especie y clima.
 *
 * Es el camino principal, no un fallback: sin red ni cuota, siempre responde.
 * El LLM solo reescribe el texto; la decision sale siempre de aqui.
 */
export const buildIrrigationAdvice = (
  device: Device,
  forecast: WeatherForecast | undefined,
  profileType: ProfileType,
): IrrigationAdvice => {
  const species = speciesById(device.speciesId);
  const isBeginner = profileType === 'principiante';
  const soil = device.lastTelemetry?.soilMoisturePct;

  // La planta existe pero aun no hay lectura.
  if (soil === undefined) {
    return {
      level: 'watch',
      title: 'Conecta tu dispositivo de riego',
      body: isBeginner
        ? `Todavía no recibimos lecturas de tu ${species.commonName.toLowerCase()}. ` +
          'Cuando conectes el dispositivo de riego te diremos exactamente ' +
          'cuándo regarla.'
        : `Sin telemetría. La ${species.commonName.toLowerCase()} necesita ` +
          `${species.soilMinPct}-${species.soilMaxPct}% de humedad de suelo.`,
      reason: 'El dispositivo aún no ha reportado telemetría.',
      source: 'rules',
    };
  }

  // Pausado por el usuario: no habra riego automatico.
  if (!device.isActive) {
    return {
      level: 'watch',
      title: 'Riego en pausa',
      body: isBeginner
        ? 'Pausaste el riego automático, así que tu planta no se regará sola. ' +
          'Reactívalo cuando quieras que AquaSave vuelva a cuidarla.'
        : `Riego automático pausado. Humedad actual ${Math.round(soil)}%.`,
      reason: 'El usuario pausó el dispositivo.',
      source: 'rules',
    };
  }

  const rounded = Math.round(soil);
  const target = soilTargetPct(species);
  const name = species.commonName.toLowerCase();

  // Por encima del maximo de la especie.
  if (rounded > species.soilMaxPct) {
    return {
      level: 'act',
      title: 'Exceso de agua',
      body: isBeginner
        ? `La tierra está muy mojada (${rounded}%). La ${name} necesita como ` +
          `máximo ${species.soilMaxPct}%: demasiada agua puede pudrir sus ` +
          'raíces. Deja que se seque antes del próximo riego.'
        : `Humedad ${rounded}% sobre el máximo de la ${name} ` +
          `(${species.soilMaxPct}%). Riesgo de asfixia radicular.`,
      reason: `Humedad ${rounded}% > máximo ${species.soilMaxPct}%.`,
      source: 'rules',
    };
  }

  // Va a llover: mejor esperar.
  if (forecast && shouldPauseForWeather(forecast)) {
    return {
      level: 'watch',
      title: 'Mejor esperar: va a llover',
      body: isBeginner
        ? `Hay ${forecast.rainProbabilityPct}% de probabilidad de lluvia. ` +
          'Deja que la lluvia riegue por ti y ahorra agua.'
        : `Lluvia ${forecast.rainProbabilityPct}% · ` +
          `${forecast.precipitationMm.toFixed(1)} mm. Posponer riego.`,
      reason: `Probabilidad de lluvia ${forecast.rainProbabilityPct}%.`,
      source: 'rules',
    };
  }

  // Bajo el minimo: hay que regar.
  if (rounded < species.soilMinPct) {
    return {
      level: 'act',
      title: 'Hora de regar',
      body: isBeginner
        ? `La tierra está seca (${rounded}%). Tu ${name} necesita al menos ` +
          `${species.soilMinPct}% de humedad, así que riégala ahora.`
        : `Humedad ${rounded}% bajo el mínimo de la ${name} ` +
          `(${species.soilMinPct}%). Objetivo ${target}%.`,
      reason: `Humedad ${rounded}% < mínimo ${species.soilMinPct}%.`,
      source: 'rules',
    };
  }

  // En rango, pero el calor seco lo vacia rapido.
  const hotAndDry =
    forecast !== undefined &&
    forecast.temperatureC >= 30 &&
    forecast.humidityPct <= 40;

  if (hotAndDry && rounded < target) {
    return {
      level: 'watch',
      title: 'Revisa el riego hoy',
      body: isBeginner
        ? `Hace ${forecast.temperatureC.toFixed(0)}°C con aire seco: tu ${name} ` +
          `perderá agua rápido. La humedad está en ${rounded}%, cerca del ` +
          'mínimo. Convendría regar hoy.'
        : `${forecast.temperatureC.toFixed(1)}°C · HR ${forecast.humidityPct}%. ` +
          `Humedad ${rounded}% bajo el objetivo ${target}%. Demanda alta.`,
      reason: `Calor (${forecast.temperatureC.toFixed(0)}°C) y aire seco ` +
        `(${forecast.humidityPct}%) con humedad ${rounded}%.`,
      source: 'rules',
    };
  }

  // Todo en orden.
  return {
    level: 'ok',
    title: 'Tu planta está bien',
    body: isBeginner
      ? `La humedad está en ${rounded}%, justo en el rango que necesita tu ` +
        `${name} (${species.soilMinPct}-${species.soilMaxPct}%). No hace ` +
        'falta regar.'
      : `Humedad ${rounded}% en rango ` +
        `${species.soilMinPct}-${species.soilMaxPct}%. Sin acción requerida.`,
    reason: `Humedad ${rounded}% dentro del rango de la ${name}.`,
    source: 'rules',
  };
};

/** Cuidados de la especie: no dependen del sensor. */
export const buildCareTips = (species: PlantSpecies): CareTip[] => {
  const tips: CareTip[] = [
    {
      icon: 'sun',
      title: 'Luz',
      body: species.sunlight,
    },
    {
      icon: 'water',
      title: 'Riego',
      body:
        `Mantén la humedad del suelo entre ${species.soilMinPct}% y ` +
        `${species.soilMaxPct}%.`,
    },
  ];

  if (species.careTip) {
    tips.push({ icon: 'leaf', title: 'Consejo', body: species.careTip });
  }

  return tips;
};
