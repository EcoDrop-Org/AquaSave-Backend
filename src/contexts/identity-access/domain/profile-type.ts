/**
 * Segmentos objetivo del proyecto (informe, seccion 1.3).
 *
 * AquaSave atiende dos segmentos definidos por el *nivel de experiencia* en el
 * cuidado de plantas:
 *
 * - principiante: necesita orientacion para interpretar las lecturas.
 * - experto: busca historial, comparacion entre periodos y configuracion.
 *
 * La app adapta como presenta la informacion segun este valor, y las
 * recomendaciones se redactan distinto para cada uno.
 */
export type ProfileType = 'principiante' | 'experto';

/**
 * Valores de la segmentacion anterior (geografica), que todavia existen en las
 * cuentas creadas antes del cambio. Se siguen aceptando en la API para no
 * romper clientes viejos, pero se normalizan al segmento equivalente.
 */
export type LegacyProfileType =
  | 'horticultor-urbano'
  | 'micro-agricultor-periurbano';

export const PROFILE_TYPES: readonly ProfileType[] = [
  'principiante',
  'experto',
];

export const LEGACY_PROFILE_TYPES: readonly LegacyProfileType[] = [
  'horticultor-urbano',
  'micro-agricultor-periurbano',
];

/**
 * Normaliza cualquier valor recibido a uno de los segmentos actuales.
 *
 * Ante un valor desconocido devuelve 'principiante': conviene explicar de mas
 * antes que esconder orientacion a quien la necesita.
 */
export const normalizeProfileType = (value?: string): ProfileType => {
  switch (value?.trim()) {
    case 'experto':
      return 'experto';
    case 'principiante':
      return 'principiante';
    // Segmentacion anterior: se mapea para no perder las cuentas existentes.
    case 'micro-agricultor-periurbano':
      return 'experto';
    case 'horticultor-urbano':
      return 'principiante';
    default:
      return 'principiante';
  }
};
