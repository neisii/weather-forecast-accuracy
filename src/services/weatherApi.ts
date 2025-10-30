import axios from 'axios';
import type { WeatherAPIResponse, ForecastAPIResponse } from '../types/weather';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export const weatherApi = {
  async getCurrentWeather(city: string): Promise<WeatherAPIResponse> {
    const response = await axios.get<WeatherAPIResponse>(`${BASE_URL}/weather`, {
      params: {
        q: city,
        appid: API_KEY,
        units: 'metric',
        lang: 'kr',
      },
    });
    return response.data;
  },

  async getForecast(city: string): Promise<ForecastAPIResponse> {
    const response = await axios.get<ForecastAPIResponse>(`${BASE_URL}/forecast`, {
      params: {
        q: city,
        appid: API_KEY,
        units: 'metric',
        lang: 'kr',
      },
    });
    return response.data;
  },
};
