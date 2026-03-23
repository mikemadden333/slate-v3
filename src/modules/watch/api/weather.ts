/**
 * Open-Meteo Weather API — Current conditions & 7-day forecast.
 * No auth required. Chicago coordinates: 41.85, -87.65
 */

import type { WeatherCurrent, DailyWeather } from '../engine/types';

const CHI_LAT = 41.85;
const CHI_LNG = -87.65;

/** Fetch current weather conditions for Chicago. */
export async function fetchWeather(): Promise<WeatherCurrent> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${CHI_LAT}&longitude=${CHI_LNG}` +
      `&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m` +
      `&temperature_unit=fahrenheit`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Weather fetch failed: ${res.status}`);
      return defaultWeather();
    }

    const data = await res.json() as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        precipitation?: number;
        wind_speed_10m?: number;
      };
    };

    const c = data.current;
    return {
      temperature: c?.temperature_2m ?? 65,
      apparentTemperature: c?.apparent_temperature ?? 65,
      precipitation: c?.precipitation ?? 0,
      windSpeed: c?.wind_speed_10m ?? 0,
    };
  } catch (err) {
    console.error('Weather fetch error:', err);
    return defaultWeather();
  }
}

/** Fetch 7-day weather forecast for the violence forecast engine. */
export async function fetchWeatherForecast(): Promise<DailyWeather[]> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${CHI_LAT}&longitude=${CHI_LNG}` +
      `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum` +
      `&temperature_unit=fahrenheit` +
      `&forecast_days=7`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Weather forecast fetch failed: ${res.status}`);
      return defaultForecast();
    }

    const data = await res.json() as {
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        apparent_temperature_max?: number[];
        precipitation_sum?: number[];
      };
    };

    const d = data.daily;
    if (!d?.time) return defaultForecast();

    return d.time.map((date, i) => ({
      date,
      temp_max: d.temperature_2m_max?.[i] ?? 65,
      temp_min: d.temperature_2m_min?.[i] ?? 50,
      apparent_temp_max: d.apparent_temperature_max?.[i] ?? 65,
      precipitation: d.precipitation_sum?.[i] ?? 0,
    }));
  } catch (err) {
    console.error('Weather forecast error:', err);
    return defaultForecast();
  }
}

function defaultWeather(): WeatherCurrent {
  return { temperature: 65, apparentTemperature: 65, precipitation: 0, windSpeed: 0 };
}

function defaultForecast(): DailyWeather[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
    temp_max: 65,
    temp_min: 50,
    apparent_temp_max: 65,
    precipitation: 0,
  }));
}
