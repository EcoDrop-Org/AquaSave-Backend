/**
 * Especies que AquaSave sabe cuidar.
 *
 * Debe mantenerse identico al catalogo del front
 * (`lib/features/devices/domain/entities/plant_species.dart`): si los
 * umbrales divergen, la app mostraria un rango distinto al que decide el
 * riego. Es estatico porque ninguna API publica da estos umbrales de
 * forma confiable; la foto y la ficha salen de Wikipedia.
 */
export type PlantCategory =
  | 'hierbas'
  | 'vegetales'
  | 'frutas'
  | 'suculentas'
  | 'interior'
  | 'flores'
  | 'terraza';

export type PlantSpecies = {
  /** Id estable que viaja en la API. No traducir. */
  id: string;
  /** Nombre que ve el usuario. */
  commonName: string;
  category: PlantCategory;
  /** Humedad de suelo minima: por debajo, necesita agua. */
  soilMinPct: number;
  /** Humedad de suelo maxima: por encima, hay exceso de riego. */
  soilMaxPct: number;
  /** Luz que necesita, en palabras del usuario. */
  sunlight: string;
  /** Consejo breve propio de la especie. */
  careTip: string;
  /** Nombre cientifico con el que se busca foto y ficha. */
  scientificName: string;
};

export const GENERIC_SPECIES_ID = 'otra';

export const PLANT_SPECIES: readonly PlantSpecies[] = [
  {
    id: 'albahaca',
    commonName: 'Albahaca',
    category: 'hierbas',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Sol directo 4-6 h',
    careTip:
      'Pellizca las flores en cuanto salgan: asi la planta sigue ' +
      'dando hojas en lugar de semillas.',
    scientificName: 'Ocimum basilicum',
  },
  {
    id: 'menta',
    commonName: 'Menta',
    category: 'hierbas',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sombra parcial',
    careTip:
      'Tenla en maceta propia: sus raices invaden el espacio de las ' +
      'demas plantas.',
    scientificName: 'Mentha',
  },
  {
    id: 'culantro',
    commonName: 'Culantro',
    category: 'hierbas',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol parcial 3-5 h',
    careTip:
      'Corta los tallos exteriores primero para que siga creciendo ' +
      'del centro.',
    scientificName: 'Coriandrum sativum',
  },
  {
    id: 'perejil',
    commonName: 'Perejil',
    category: 'hierbas',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol parcial 3-5 h',
    careTip: 'Tarda en germinar; no te preocupes si demora semanas.',
    scientificName: 'Petroselinum crispum',
  },
  {
    id: 'romero',
    commonName: 'Romero',
    category: 'hierbas',
    soilMinPct: 25,
    soilMaxPct: 50,
    sunlight: 'Sol directo 6-8 h',
    careTip:
      'Prefiere quedarse seco. Es mas facil matarlo por exceso de ' +
      'riego que por falta.',
    scientificName: 'Salvia rosmarinus',
  },
  {
    id: 'oregano',
    commonName: 'Oregano',
    category: 'hierbas',
    soilMinPct: 30,
    soilMaxPct: 55,
    sunlight: 'Sol directo 5-7 h',
    careTip: 'Deja secar la capa superior de tierra entre riegos.',
    scientificName: 'Origanum vulgare',
  },
  {
    id: 'tomillo',
    commonName: 'Tomillo',
    category: 'hierbas',
    soilMinPct: 25,
    soilMaxPct: 50,
    sunlight: 'Sol directo 6-8 h',
    careTip:
      'Resiste la sequia: riega solo cuando la tierra este seca al ' +
      'tacto.',
    scientificName: 'Thymus vulgaris',
  },
  {
    id: 'hierbabuena',
    commonName: 'Hierbabuena',
    category: 'hierbas',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sombra parcial',
    careTip: 'Pide tierra siempre humeda; no la dejes secar del todo.',
    scientificName: 'Mentha spicata',
  },
  {
    id: 'tomate',
    commonName: 'Tomate',
    category: 'vegetales',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol directo 6-8 h',
    careTip:
      'Riega la tierra, no las hojas. Mojar las hojas favorece los ' +
      'hongos.',
    scientificName: 'Solanum lycopersicum',
  },
  {
    id: 'lechuga',
    commonName: 'Lechuga',
    category: 'vegetales',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sol parcial 3-5 h',
    careTip:
      'Necesita tierra fresca y humeda. Si le falta agua las hojas ' +
      'amargan.',
    scientificName: 'Lactuca sativa',
  },
  {
    id: 'aji',
    commonName: 'Aji',
    category: 'vegetales',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Sol directo 6-8 h',
    careTip: 'Con calor necesita mas agua: revisa la humedad a diario.',
    scientificName: 'Capsicum',
  },
  {
    id: 'espinaca',
    commonName: 'Espinaca',
    category: 'vegetales',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sol parcial 3-5 h',
    careTip:
      'Crece mejor en epoca fresca; con mucho calor se va a ' +
      'semilla.',
    scientificName: 'Spinacia oleracea',
  },
  {
    id: 'rabanito',
    commonName: 'Rabanito',
    category: 'vegetales',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol directo 4-6 h',
    careTip:
      'Esta listo en un mes. Si le falta agua sale picante y ' +
      'fibroso.',
    scientificName: 'Raphanus sativus',
  },
  {
    id: 'zanahoria',
    commonName: 'Zanahoria',
    category: 'vegetales',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol directo 5-7 h',
    careTip:
      'Necesita tierra suelta y profunda para que la raiz crezca ' +
      'derecha.',
    scientificName: 'Daucus carota',
  },
  {
    id: 'cebolla-china',
    commonName: 'Cebolla china',
    category: 'vegetales',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol directo 5-7 h',
    careTip: 'Corta las hojas y vuelven a crecer varias veces.',
    scientificName: 'Allium fistulosum',
  },
  {
    id: 'fresa',
    commonName: 'Fresa',
    category: 'frutas',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Sol directo 5-7 h',
    careTip:
      'Que los frutos no toquen la tierra humeda para que no se ' +
      'pudran.',
    scientificName: 'Fragaria',
  },
  {
    id: 'limon',
    commonName: 'Limonero',
    category: 'frutas',
    soilMinPct: 40,
    soilMaxPct: 65,
    sunlight: 'Sol directo 6-8 h',
    careTip:
      'En maceta necesita buen drenaje; el agua estancada pudre sus ' +
      'raices.',
    scientificName: 'Citrus limon',
  },
  {
    id: 'arandano',
    commonName: 'Arandano',
    category: 'frutas',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sol directo 5-7 h',
    careTip: 'Pide tierra acida y humeda constante.',
    scientificName: 'Vaccinium',
  },
  {
    id: 'suculenta',
    commonName: 'Suculenta',
    category: 'suculentas',
    soilMinPct: 10,
    soilMaxPct: 35,
    sunlight: 'Luz indirecta brillante',
    careTip:
      'Riega poco y espaciado. Guarda agua en sus hojas: el exceso ' +
      'la pudre.',
    scientificName: 'Planta suculenta',
  },
  {
    id: 'cactus',
    commonName: 'Cactus',
    category: 'suculentas',
    soilMinPct: 5,
    soilMaxPct: 25,
    sunlight: 'Sol directo 6 h',
    careTip: 'En invierno casi no necesita agua.',
    scientificName: 'Cactaceae',
  },
  {
    id: 'aloe',
    commonName: 'Aloe vera',
    category: 'suculentas',
    soilMinPct: 15,
    soilMaxPct: 40,
    sunlight: 'Luz indirecta brillante',
    careTip: 'Deja secar la tierra por completo antes del siguiente riego.',
    scientificName: 'Aloe vera',
  },
  {
    id: 'echeveria',
    commonName: 'Echeveria',
    category: 'suculentas',
    soilMinPct: 10,
    soilMaxPct: 30,
    sunlight: 'Luz indirecta brillante',
    careTip:
      'Riega en la tierra, nunca sobre la roseta: el agua al centro ' +
      'la pudre.',
    scientificName: 'Echeveria',
  },
  {
    id: 'potho',
    commonName: 'Potho',
    category: 'interior',
    soilMinPct: 40,
    soilMaxPct: 65,
    sunlight: 'Luz indirecta',
    careTip:
      'Muy resistente: tolera que te olvides de regarla de vez en ' +
      'cuando.',
    scientificName: 'Epipremnum aureum',
  },
  {
    id: 'sansevieria',
    commonName: 'Sansevieria',
    category: 'interior',
    soilMinPct: 15,
    soilMaxPct: 40,
    sunlight: 'Luz indirecta, tolera sombra',
    careTip: 'Riega solo cuando la tierra este seca varios centimetros.',
    scientificName: 'Dracaena trifasciata',
  },
  {
    id: 'helecho',
    commonName: 'Helecho',
    category: 'interior',
    soilMinPct: 60,
    soilMaxPct: 85,
    sunlight: 'Sombra o luz filtrada',
    careTip: 'Necesita humedad alta: rociar las hojas le hace bien.',
    scientificName: 'Nephrolepis exaltata',
  },
  {
    id: 'ficus',
    commonName: 'Ficus',
    category: 'interior',
    soilMinPct: 40,
    soilMaxPct: 65,
    sunlight: 'Luz indirecta brillante',
    careTip:
      'No le gusta que la muevan de sitio; pierde hojas al ' +
      'cambiarla.',
    scientificName: 'Ficus benjamina',
  },
  {
    id: 'bambu',
    commonName: 'Bambu de la suerte',
    category: 'interior',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Luz indirecta',
    careTip: 'Crece en agua o en tierra siempre humeda.',
    scientificName: 'Dracaena sanderiana',
  },
  {
    id: 'lirio-paz',
    commonName: 'Lirio de la paz',
    category: 'interior',
    soilMinPct: 50,
    soilMaxPct: 75,
    sunlight: 'Luz indirecta, tolera sombra',
    careTip:
      'Cuando le falta agua baja las hojas: es su forma de ' +
      'avisarte.',
    scientificName: 'Spathiphyllum',
  },
  {
    id: 'orquidea',
    commonName: 'Orquidea',
    category: 'flores',
    soilMinPct: 35,
    soilMaxPct: 60,
    sunlight: 'Luz indirecta brillante',
    careTip:
      'No riegues la tierra: moja las raices y deja escurrir. El ' +
      'agua estancada las pudre.',
    scientificName: 'Orchidaceae',
  },
  {
    id: 'rosa',
    commonName: 'Rosa',
    category: 'flores',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Sol directo 6 h',
    careTip: 'Riega en la base por la manana; mojar las hojas trae hongos.',
    scientificName: 'Rosa',
  },
  {
    id: 'violeta',
    commonName: 'Violeta africana',
    category: 'flores',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Luz indirecta',
    careTip:
      'Riega por abajo, en el platito: sus hojas se manchan si se ' +
      'mojan.',
    scientificName: 'Saintpaulia',
  },
  {
    id: 'girasol',
    commonName: 'Girasol',
    category: 'flores',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Sol directo 6-8 h',
    careTip: 'Bebe mucha agua mientras crece; en maceta revisala a diario.',
    scientificName: 'Helianthus annuus',
  },
  {
    id: 'hortensia',
    commonName: 'Hortensia',
    category: 'flores',
    soilMinPct: 55,
    soilMaxPct: 80,
    sunlight: 'Sombra parcial',
    careTip: 'El color de sus flores cambia con la acidez de la tierra.',
    scientificName: 'Hydrangea',
  },
  {
    id: 'geranio',
    commonName: 'Geranio',
    category: 'terraza',
    soilMinPct: 35,
    soilMaxPct: 60,
    sunlight: 'Sol directo 5-7 h',
    careTip:
      'Quita las flores secas y seguira floreciendo toda la ' +
      'temporada.',
    scientificName: 'Pelargonium',
  },
  {
    id: 'petunia',
    commonName: 'Petunia',
    category: 'terraza',
    soilMinPct: 40,
    soilMaxPct: 65,
    sunlight: 'Sol directo 5-6 h',
    careTip:
      'En maceta colgante se seca rapido: revisala a diario en ' +
      'verano.',
    scientificName: 'Petunia',
  },
  {
    id: 'lavanda',
    commonName: 'Lavanda',
    category: 'terraza',
    soilMinPct: 20,
    soilMaxPct: 45,
    sunlight: 'Sol directo 6-8 h',
    careTip: 'Odia el exceso de agua. Necesita drenaje muy suelto.',
    scientificName: 'Lavandula',
  },
  {
    id: 'bugambilia',
    commonName: 'Bugambilia',
    category: 'terraza',
    soilMinPct: 25,
    soilMaxPct: 50,
    sunlight: 'Sol directo 6-8 h',
    careTip:
      'Florece mas cuando se le riega poco; el exceso le da solo ' +
      'hojas.',
    scientificName: 'Bougainvillea',
  },
  {
    id: 'jazmin',
    commonName: 'Jazmin',
    category: 'terraza',
    soilMinPct: 45,
    soilMaxPct: 70,
    sunlight: 'Sol parcial 4-6 h',
    careTip: 'Necesita algo donde trepar para crecer bien.',
    scientificName: 'Jasminum',
  },
  {
    id: 'clavel',
    commonName: 'Clavel',
    category: 'terraza',
    soilMinPct: 40,
    soilMaxPct: 65,
    sunlight: 'Sol directo 5-7 h',
    careTip: 'Pide buen drenaje; no dejes agua en el platito.',
    scientificName: 'Dianthus caryophyllus',
  },
  {
    id: 'otra',
    commonName: 'Otra planta',
    category: 'interior',
    soilMinPct: 40,
    soilMaxPct: 70,
    sunlight: 'Segun la especie',
    careTip: '',
    scientificName: '',
  },
];

export const genericSpecies = (): PlantSpecies =>
  PLANT_SPECIES.find((s) => s.id === GENERIC_SPECIES_ID)!;

/**
 * Resuelve una especie por su id. Devuelve la generica si no se
 * reconoce, para que el motor nunca se quede sin umbrales.
 */
export const speciesById = (id?: string | null): PlantSpecies => {
  const needle = id?.trim().toLowerCase();
  if (!needle) return genericSpecies();
  return PLANT_SPECIES.find((s) => s.id === needle) ?? genericSpecies();
};

/** Humedad ideal de la especie, punto medio del rango. */
export const soilTargetPct = (species: PlantSpecies): number =>
  Math.round((species.soilMinPct + species.soilMaxPct) / 2);
