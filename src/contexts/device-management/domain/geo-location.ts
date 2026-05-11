import { badRequest } from '../../../shared/http/http-error.js';

export type GeoLocation = {
  label: string;
  latitude?: number;
  longitude?: number;
};

export const createGeoLocation = (input: GeoLocation): GeoLocation => {
  const label = input.label.trim();
  if (label.length < 3) {
    throw badRequest('Device location must contain at least 3 characters');
  }

  if (
    (input.latitude === undefined) !== (input.longitude === undefined)
  ) {
    throw badRequest('Latitude and longitude must be provided together');
  }

  if (
    input.latitude !== undefined &&
    (input.latitude < -90 || input.latitude > 90)
  ) {
    throw badRequest('Latitude must be between -90 and 90');
  }

  if (
    input.longitude !== undefined &&
    (input.longitude < -180 || input.longitude > 180)
  ) {
    throw badRequest('Longitude must be between -180 and 180');
  }

  return {
    label,
    latitude: input.latitude,
    longitude: input.longitude,
  };
};
