import type { GeminiAdviceService } from '../infrastructure/gemini-advice.service.js';

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = 'AquaSave/1.0 (proyecto universitario UPC)';

export type PlantSuggestion = {
  /** Nombre cientifico, con el que luego se resuelve la ficha. */
  scientificName: string;
  /** Nombre comun, si la fuente lo trae. */
  commonName?: string;
  imageUrl: string;
};

/**
 * Sugerencias de planta para lo que escribe el usuario.
 *
 * Existe porque un nombre suelto es ambiguo o puede venir mal escrito:
 * "carnivora" coincide antes con el orden de mamiferos Carnivora que con una
 * planta, y "lotto" no existe. En lugar de adivinar y mostrar una foto
 * equivocada, se devuelven varias opciones con imagen para que el usuario
 * elija la suya.
 */
export class PlantSuggestionsService {
  private readonly cache = new Map<string, PlantSuggestion[]>();

  constructor(private readonly gemini?: GeminiAdviceService) {}

  async suggest(term: string): Promise<PlantSuggestion[]> {
    const query = term.trim();
    if (query.length < 2) return [];

    const key = query.toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return cached;

    let results = await this.search(query);

    // Sin coincidencias el nombre puede estar mal escrito o ser muy local
    // ("lotto", "flor de muerto"): la IA propone nombres con los que buscar.
    if (results.length === 0) {
      for (const alternative of await this.askAi(query)) {
        results = await this.search(alternative);
        if (results.length > 0) break;
      }
    }

    if (results.length > 0) this.cache.set(key, results);
    return results;
  }

  /** Busca en iNaturalist y se queda solo con plantas que tengan foto. */
  private async search(term: string): Promise<PlantSuggestion[]> {
    try {
      const url = new URL('https://api.inaturalist.org/v1/taxa');
      url.searchParams.set('q', term);
      url.searchParams.set('per_page', '12');

      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) return [];

      const body = (await response.json()) as {
        results?: {
          name?: string;
          preferred_common_name?: string;
          iconic_taxon_name?: string;
          default_photo?: { medium_url?: string } | null;
        }[];
      };

      return (body.results ?? [])
        // El filtro iconic_taxa de la API no funciona, asi que se filtra
        // aqui: sin esto "carnivora" devuelve mamiferos.
        .filter((t) => t.iconic_taxon_name === 'Plantae')
        .filter((t) => t.name && t.default_photo?.medium_url)
        .slice(0, 6)
        .map((t) => ({
          scientificName: t.name!,
          commonName: t.preferred_common_name,
          imageUrl: t.default_photo!.medium_url!,
        }));
    } catch (err) {
      console.warn(
        `[Suggestions] iNaturalist (${term}):`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }

  /** Nombres alternativos con los que reintentar la busqueda. */
  private async askAi(term: string): Promise<string[]> {
    if (!this.gemini?.enabled) return [];

    try {
      const text = await this.gemini.generate(
        `El usuario escribio "${term}" buscando una planta. Puede estar mal ` +
          'escrito o ser un nombre local. Da hasta 3 nombres cientificos de ' +
          'plantas que probablemente quiso decir, del mas al menos probable. ' +
          'Si no parece una planta, responde con la lista vacia. ' +
          'Responde SOLO con JSON: {"names":["Genus species", "..."]}',
      );
      const parsed = JSON.parse(cleanJson(text)) as { names?: unknown };
      if (!Array.isArray(parsed.names)) return [];

      return parsed.names
        .filter((n): n is string => typeof n === 'string')
        .map((n) => n.trim())
        .filter(Boolean)
        .slice(0, 3);
    } catch (err) {
      console.warn(
        `[Suggestions] LLM (${term}):`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }
}

const cleanJson = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
