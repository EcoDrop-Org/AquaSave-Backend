/**
 * Especies que AquaSave sabe cuidar.
 *
 * Debe mantenerse identico al catalogo del front
 * (`lib/features/devices/domain/entities/plant_species.dart`): si los
 * umbrales divergen, la app mostraria un rango distinto al que decide el
 * riego. Es estatico porque ninguna API publica da estos umbrales de forma
 * confiable; Perenual solo aporta la ficha y la foto.
 */
export type PlantSpecies = {
  /** Id estable que viaja en la API. No traducir. */
  id: string;
  /** Nombre que ve el usuario. */
  commonName: string;
  /** Humedad de suelo minima: por debajo, la planta necesita agua. */
  soilMinPct: number;
  /** Humedad de suelo maxima: por encima, hay riesgo de exceso de riego. */
  soilMaxPct: number;
  /** Luz que necesita, en palabras del usuario. */
  sunlight: string;
  /** Consejo breve propio de la especie. */
  careTip: string;
};

export const GENERIC_SPECIES_ID = 'otra';

export const PLANT_SPECIES: readonly PlantSpecies[] = [
  {
    id: 'albahaca',
    commonName: 'Albahaca',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Sol directo 4-6 h',
    careTip:
      'Pellizca las flores en cuanto salgan: asi la planta sigue dando hojas ' +
      'en lugar de semillas.',
  },
  {
    id: 'tomate',
    commonName: 'Tomate',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol directo 6-8 h',
    careTip:
      'Riega la tierra, no las hojas. Mojar las hojas favorece los hongos.',
  },
  {
    id: 'lechuga',
    commonName: 'Lechuga',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sol parcial 3-5 h',
    careTip:
      'Necesita tierra fresca y humeda. Si le falta agua las hojas amargan.',
  },
  {
    id: 'culantro',
    commonName: 'Culantro',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol parcial 3-5 h',
    careTip:
      'Corta los tallos exteriores primero para que siga creciendo del centro.',
  },
  {
    id: 'menta',
    commonName: 'Menta',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sombra parcial',
    careTip:
      'Tenla en maceta propia: sus raices invaden el espacio de las demas ' +
      'plantas.',
  },
  {
    id: 'perejil',
    commonName: 'Perejil',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol parcial 3-5 h',
    careTip: 'Tarda en germinar; no te preocupes si demora semanas.',
  },
  {
    id: 'romero',
    commonName: 'Romero',
    soilMinPct: 25,
    soilMaxPct: 50,
    sunlight: 'Sol directo 6-8 h',
    careTip:
      'Prefiere quedarse seco. Es mas facil matarlo por exceso de riego que ' +
      'por falta.',
  },
  {
    id: 'oregano',
    commonName: 'Oregano',
    soilMinPct: 30,
    soilMaxPct: 55,
    sunlight: 'Sol directo 5-7 h',
    careTip: 'Deja secar la capa superior de tierra entre riegos.',
  },
  {
    id: 'aji',
    commonName: 'Aji',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Sol directo 6-8 h',
    careTip: 'Con calor necesita mas agua: revisa la humedad a diario.',
  },
  {
    id: 'fresa',
    commonName: 'Fresa',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol directo 5-7 h',
    careTip: 'Que los frutos no toquen la tierra humeda para que no se pudran.',
  },
  {
    id: 'suculenta',
    commonName: 'Suculenta',
    soilMinPct: 10,
    soilMaxPct: 35,
    sunlight: 'Luz indirecta brillante',
    careTip:
      'Riega poco y espaciado. Guarda agua en sus hojas: el exceso la pudre.',
  },
  {
    id: 'aloe',
    commonName: 'Aloe vera',
    soilMinPct: 15,
    soilMaxPct: 40,
    sunlight: 'Luz indirecta brillante',
    careTip: 'Deja secar la tierra por completo antes del siguiente riego.',
  },
  {
    id: 'cactus',
    commonName: 'Cactus',
    soilMinPct: 5,
    soilMaxPct: 25,
    sunlight: 'Sol directo 6 h',
    careTip: 'En invierno casi no necesita agua.',
  },
  {
    id: 'potho',
    commonName: 'Potho',
    soilMinPct: 40,
    soilMaxPct: 65,
    sunlight: 'Luz indirecta',
    careTip:
      'Muy resistente: tolera que te olvides de regarla de vez en cuando.',
  },
  {
    id: 'sansevieria',
    commonName: 'Sansevieria',
    soilMinPct: 15,
    soilMaxPct: 40,
    sunlight: 'Luz indirecta, tolera sombra',
    careTip: 'Riega solo cuando la tierra este seca varios centimetros.',
  },
  // Fallback: umbrales genericos de planta de interior.
  {
    id: GENERIC_SPECIES_ID,
    commonName: 'Otra planta',
    soilMinPct: 40,
    soilMaxPct: 70,
    sunlight: 'Segun la especie',
    careTip: '',
  },
];

export const genericSpecies = (): PlantSpecies =>
  PLANT_SPECIES.find((s) => s.id === GENERIC_SPECIES_ID)!;

/** Devuelve la generica si el id no se reconoce. */
export const speciesById = (id?: string | null): PlantSpecies => {
  const needle = id?.trim().toLowerCase();
  if (!needle) return genericSpecies();
  return PLANT_SPECIES.find((s) => s.id === needle) ?? genericSpecies();
};

/** Humedad ideal de la especie, punto medio del rango. */
export const soilTargetPct = (species: PlantSpecies): number =>
  Math.round((species.soilMinPct + species.soilMaxPct) / 2);
