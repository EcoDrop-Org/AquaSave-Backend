export type ProfileType = 'horticultor-urbano' | 'micro-agricultor-periurbano';

export const normalizeProfileType = (value?: string): ProfileType => {
  if (value === 'micro-agricultor-periurbano') {
    return value;
  }
  return 'horticultor-urbano';
};
