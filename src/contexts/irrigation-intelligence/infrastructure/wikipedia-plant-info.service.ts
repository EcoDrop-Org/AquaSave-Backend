import type { PlantSpecies } from '../../device-management/domain/plant-species.js';

const FETCH_TIMEOUT_MS = 6_000;

export type PlantInfo = {
  description?: string;
  imageUrl?: string;
};

/**
 * Foto y descripcion de la planta desde Wikipedia en espanol.
 *
 * Se eligio Wikipedia porque no pide API key, no tiene cuota diaria y
 * resuelve *cualquier* planta: las del catalogo por su nombre cientifico, y
 * tambien la que el usuario escriba al elegir "Otra planta". Perenual, en
 * cambio, devolvia un placeholder de paywall en su plan gratuito.
 *
 * El resultado se cachea en memoria (incluido el vacio) para no repetir
 * peticiones: Wikipedia responde 429 si se la consulta muy seguido.
 */
export class WikipediaPlantInfoService {
  private readonly cache = new Map<string, PlantInfo>();

  /** Siempre disponible: no necesita credenciales. */
  get enabled(): boolean {
    return true;
  }

  /**
   * @param species especie del catalogo.
   * @param userTerm nombre que escribio el usuario, para "Otra planta".
   */
  async getInfo(
    species: PlantSpecies,
    userTerm?: string,
  ): Promise<PlantInfo | undefined> {
    // Con especie generica se busca lo que escribio el usuario.
    const term = species.scientificName || userTerm?.trim() || '';
    if (!term) return undefined;

    const key = term.toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const info = await this.fetchSummary(term);
      this.cache.set(key, info);
      return info;
    } catch (err) {
      console.warn(
        `[Wikipedia] No disponible (${term}):`,
        err instanceof Error ? err.message : err,
      );
      this.cache.set(key, {});
      return undefined;
    }
  }

  private async fetchSummary(term: string): Promise<PlantInfo> {
    const title = encodeURIComponent(term.replace(/\s+/g, '_'));
    const response = await fetch(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${title}`,
      {
        headers: {
          // Wikipedia pide identificarse; sin esto responde 403.
          'user-agent': 'AquaSave/1.0 (proyecto universitario UPC)',
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const body = (await response.json()) as {
      extract?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      type?: string;
    };

    // Las paginas de desambiguacion no describen una planta concreta.
    if (body.type === 'disambiguation') return {};

    return {
      description: trimDescription(body.extract),
      imageUrl: body.thumbnail?.source ?? body.originalimage?.source,
    };
  }
}

/** Recorta el extracto a las dos primeras frases. */
const trimDescription = (extract?: string): string | undefined => {
  const text = extract?.trim();
  if (!text) return undefined;

  const sentences = text.split(/(?<=\.)\s+/);
  const short = sentences.slice(0, 2).join(' ').trim();
  return short.length > 0 ? short : undefined;
};
