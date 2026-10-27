import type { PlantSpecies } from '../../device-management/domain/plant-species.js';

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = 'AquaSave/1.0 (proyecto universitario UPC)';

export type PlantInfo = {
  description?: string;
  imageUrl?: string;
};

/**
 * Ficha de la planta: descripcion de Wikipedia y foto de iNaturalist.
 *
 * Se usan dos fuentes porque cada una cubre lo que a la otra le falta:
 * Wikipedia describe bien pero muchos articulos de plantas no tienen imagen
 * destacada, y ademas responde 429 si se la consulta seguido. iNaturalist es
 * una base de biodiversidad y casi siempre tiene foto de la especie.
 *
 * Ninguna pide API key. Se consultan en paralelo y cada una se cachea por su
 * cuenta, asi un fallo de una no deja la ficha vacia.
 */
export class PlantInfoService {
  private readonly wiki = new Map<string, WikiSummary>();
  private readonly images = new Map<string, string | undefined>();

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
    const scientific = species.scientificName?.trim() ?? '';
    const typed = userTerm?.trim() ?? '';
    // Sin nombre cientifico (caso "Otra planta") se busca lo que escribio.
    const term = scientific || typed;
    if (!term) return undefined;

    const [summary, photo] = await Promise.all([
      this.getWiki(term),
      this.getImage(term),
    ]);

    // iNaturalist suele tener mejor foto de la especie; la de Wikipedia
    // cubre lo que no es un taxon ("planta carnivora").
    const imageUrl = photo ?? summary.imageUrl;
    if (!summary.description && !imageUrl) return undefined;
    return { description: summary.description, imageUrl };
  }

  // ── Descripcion: Wikipedia ────────────────────────────────────────────────

  /** Descripcion y, de paso, la imagen del articulo como respaldo. */
  private async getWiki(term: string): Promise<WikiSummary> {
    const key = term.toLowerCase();
    const cached = this.wiki.get(key);
    if (cached) return cached;

    let summary: WikiSummary = {};
    try {
      summary = await this.fetchSummary(term);
      // El titulo exacto puede no existir (nombre comun como "diente de
      // leon"): se busca el articulo y se reintenta.
      if (!summary.description && !summary.imageUrl) {
        const title = await this.searchTitle(term);
        if (title) summary = await this.fetchSummary(title);
      }
    } catch (err) {
      console.warn(
        `[Wikipedia] ${term}:`,
        err instanceof Error ? err.message : err,
      );
    }

    // Solo se cachea lo que sirvio: un 429 pasajero no debe dejar la planta
    // sin ficha de forma permanente.
    if (summary.description || summary.imageUrl) this.wiki.set(key, summary);
    return summary;
  }

  private async fetchSummary(title: string): Promise<WikiSummary> {
    const encoded = encodeURIComponent(title.replace(/\s+/g, '_'));
    const response = await fetch(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    // 404: no existe con ese titulo. 429: Wikipedia nos esta limitando.
    if (!response.ok) return {};

    const body = (await response.json()) as {
      extract?: string;
      type?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };
    if (body.type === 'disambiguation') return {};

    return {
      description: trimDescription(body.extract),
      imageUrl: body.thumbnail?.source ?? body.originalimage?.source,
    };
  }

  /** Busca el articulo por nombre comun ("diente de leon"). */
  private async searchTitle(term: string): Promise<string | undefined> {
    const url = new URL('https://es.wikipedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srsearch', term);
    url.searchParams.set('srlimit', '1');

    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;

    const body = (await response.json()) as {
      query?: { search?: { title?: string }[] };
    };
    return body.query?.search?.[0]?.title;
  }

  // ── Foto: iNaturalist ─────────────────────────────────────────────────────

  private async getImage(term: string): Promise<string | undefined> {
    const key = term.toLowerCase();
    const cached = this.images.get(key);
    if (cached) return cached;

    let imageUrl: string | undefined;
    try {
      imageUrl = await this.fetchPhoto(term);
    } catch (err) {
      console.warn(
        `[iNaturalist] ${term}:`,
        err instanceof Error ? err.message : err,
      );
    }

    if (imageUrl) this.images.set(key, imageUrl);
    return imageUrl;
  }

  private async fetchPhoto(term: string): Promise<string | undefined> {
    const url = new URL('https://api.inaturalist.org/v1/taxa');
    url.searchParams.set('q', term);
    url.searchParams.set('per_page', '1');

    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;

    const body = (await response.json()) as {
      results?: { default_photo?: { medium_url?: string } | null }[];
    };
    return body.results?.[0]?.default_photo?.medium_url ?? undefined;
  }
}

type WikiSummary = { description?: string; imageUrl?: string };

/** Recorta el extracto a las dos primeras frases. */
const trimDescription = (extract?: string): string | undefined => {
  const text = extract?.trim();
  if (!text) return undefined;

  const sentences = text.split(/(?<=\.)\s+/);
  const short = sentences.slice(0, 2).join(' ').trim();
  return short.length > 0 ? short : undefined;
};
