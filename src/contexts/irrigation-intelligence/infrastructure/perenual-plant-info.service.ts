import type { PlantSpecies } from '../../device-management/domain/plant-species.js';

const FETCH_TIMEOUT_MS = 6_000;

export type PlantInfo = {
  description?: string;
  imageUrl?: string;
};

/**
 * Ficha e imagen de la especie desde Perenual.
 *
 * Solo lo prescindible: los umbrales de riego salen del catalogo propio.
 * El free tier son ~100 req/dia, asi que se cachea por especie (~15 en
 * total) y la ficha sobrevive a que la API se caiga.
 */
export class PerenualPlantInfoService {
  /** Cache por id de especie. Un valor vacio significa "ya se intento". */
  private readonly cache = new Map<string, PlantInfo>();

  /** Nombres en ingles para buscar en Perenual (la API no entiende espanol). */
  private static readonly searchTerms: Record<string, string> = {
    albahaca: 'basil',
    // Nombre cientifico: "tomato" devolvia "tree tomato" y "mint"
    // devolvia "hummingbird's mint".
    tomate: 'solanum lycopersicum',
    lechuga: 'lettuce',
    culantro: 'cilantro',
    menta: 'mentha',
    perejil: 'parsley',
    romero: 'rosemary',
    oregano: 'oregano',
    aji: 'chili pepper',
    fresa: 'strawberry',
    suculenta: 'succulent',
    aloe: 'aloe vera',
    cactus: 'cactus',
    potho: 'pothos',
    sansevieria: 'snake plant',
  };

  constructor(private readonly apiKey: string | undefined) {}

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  async getInfo(species: PlantSpecies): Promise<PlantInfo | undefined> {
    if (!this.apiKey) return undefined;

    const cached = this.cache.get(species.id);
    if (cached) return cached;

    const term = PerenualPlantInfoService.searchTerms[species.id];
    if (!term) return undefined;

    try {
      const info = await this.fetchInfo(term);
      // Se cachea incluso vacio para no gastar cuota en balde.
      this.cache.set(species.id, info);
      return info;
    } catch (err) {
      console.warn(
        `[Perenual] No disponible (${species.id}):`,
        err instanceof Error ? err.message : err,
      );
      // Vacio para no insistir en esta ejecucion.
      this.cache.set(species.id, {});
      return undefined;
    }
  }

  private async fetchInfo(term: string): Promise<PlantInfo> {
    const url = new URL('https://perenual.com/api/species-list');
    url.searchParams.set('key', this.apiKey!);
    url.searchParams.set('q', term);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const body = (await response.json()) as {
      data?: {
        common_name?: string;
        default_image?: { medium_url?: string; original_url?: string } | null;
      }[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(body.message ?? `HTTP ${response.status}`);
    }

    const first = body.data?.[0];
    if (!first) return {};

    const image = first.default_image;
    const imageUrl = image?.medium_url ?? image?.original_url ?? undefined;

    return {
      description: first.common_name,
      // El free tier devuelve "upgrade_access.jpg" en vez de la foto para
      // parte del catalogo: se descarta y la app usa su icono.
      imageUrl:
        imageUrl && !imageUrl.includes('upgrade_access') ? imageUrl : undefined,
    };
  }
}
