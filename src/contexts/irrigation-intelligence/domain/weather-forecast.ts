export type WeatherForecast = {
  deviceId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  rainProbabilityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  conditionLabel: string;
  retrievedAt: string;
  validUntil: string;
};

export const shouldPauseForWeather = (forecast: WeatherForecast): boolean => {
  return forecast.rainProbabilityPct >= 70 || forecast.precipitationMm > 0;
};
