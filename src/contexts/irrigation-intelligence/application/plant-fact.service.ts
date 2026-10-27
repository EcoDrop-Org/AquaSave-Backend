import {
  GENERIC_SPECIES_ID,
  speciesById,
  type PlantSpecies,
} from '../../device-management/domain/plant-species.js';
import type { GeminiAdviceService } from '../infrastructure/gemini-advice.service.js';

export type PlantFact = {
  text: string;
  source: 'rules' | 'ai';
};

/**
 * Dato curioso de la especie, para la ficha de la planta.
 *
 * Se piden varios al modelo de una vez y se van sirviendo rotados: asi cada
 * visita muestra uno distinto sin gastar una llamada por apertura.
 */
export class PlantFactService {
  /** Datos ya generados por especie. */
  private readonly cache = new Map<string, string[]>();
  /** Cuantos se han servido de cada especie, para ir rotando. */
  private readonly served = new Map<string, number>();

  constructor(private readonly gemini: GeminiAdviceService) {}

  async getFact(speciesId?: string, userTerm?: string): Promise<PlantFact> {
    const species = speciesById(speciesId);
    // Con "Otra planta" el nombre lo escribio el usuario.
    const name =
      species.id === GENERIC_SPECIES_ID ? userTerm?.trim() : species.commonName;
    const key = (name || species.commonName).toLowerCase();

    const cached = this.cache.get(key);
    if (cached && cached.length > 0) {
      return { text: this.rotate(key, cached), source: 'ai' };
    }

    try {
      const facts = await this.generate(species, name);
      if (facts.length === 0) throw new Error('Sin datos');
      this.cache.set(key, facts);
      return { text: this.rotate(key, facts), source: 'ai' };
    } catch (err) {
      console.warn(
        `[PlantFact] LLM no disponible (${key}):`,
        err instanceof Error ? err.message : err,
      );
      return { text: fallbackFact(species), source: 'rules' };
    }
  }

  /** Devuelve uno distinto en cada llamada, dando la vuelta al llegar al final. */
  private rotate(key: string, facts: string[]): string {
    const index = this.served.get(key) ?? 0;
    this.served.set(key, index + 1);
    return facts[index % facts.length]!;
  }

  private async generate(
    species: PlantSpecies,
    name?: string,
  ): Promise<string[]> {
    const plant = name || species.commonName;
    const prompt = [
      `Dame 6 datos curiosos y poco conocidos sobre la planta "${plant}".`,
      '',
      'Reglas:',
      '- Cada dato en una sola frase, maximo 20 palabras.',
      '- Que sorprendan: origen, historia, usos, biologia, records.',
      '- Nada de consejos de riego ni de cuidado.',
      '- En espanol, sin emojis ni markdown.',
      '',
      'Responde SOLO con JSON: {"facts":["...","...","..."]}',
    ].join('\n');

    const text = await this.gemini.generate(prompt);
    const parsed = JSON.parse(cleanJson(text)) as { facts?: unknown };

    if (!Array.isArray(parsed.facts)) return [];
    return parsed.facts
      .filter((f): f is string => typeof f === 'string')
      .map((f) => f.trim())
      .filter((f) => f.length > 10)
      .slice(0, 6);
  }
}

const cleanJson = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

/** Dato por reglas, para cuando el LLM no responde. */
const fallbackFact = (species: PlantSpecies): string => {
  const target = Math.round((species.soilMinPct + species.soilMaxPct) / 2);
  return (
    `La ${species.commonName.toLowerCase()} se mantiene mejor alrededor del ` +
    `${target}% de humedad en la tierra, y necesita ${species.sunlight.toLowerCase()}.`
  );
};
