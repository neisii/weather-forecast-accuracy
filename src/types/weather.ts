export type CurrentWeather = {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
};

export type ForecastItem = {
  date: Date;
  temperature: number;
  description: string;
  icon: string;
};

export type Forecast = {
  daily: ForecastItem[];
};

// OpenWeatherMap API Response Types
export type WeatherAPIResponse = {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
};

export type ForecastAPIResponse = {
  list: Array<{
    dt: number;
    main: {
      temp: number;
    };
    weather: Array<{
      description: string;
      icon: string;
    }>;
  }>;
};
