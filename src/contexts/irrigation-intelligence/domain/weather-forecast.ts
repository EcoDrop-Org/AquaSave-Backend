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
  /**
   * true cuando el proveedor externo no respondio y estos son valores por
   * defecto, no una medicion. La app lo avisa para que el usuario no lea
   * 20 C como si fuera la temperatura real de su zona.
   */
  isEstimated: boolean;
  retrievedAt: string;
  validUntil: string;
};

export const shouldPauseForWeather = (forecast: WeatherForecast): boolean => {
  return forecast.rainProbabilityPct >= 70 || forecast.precipitationMm > 0;
};
