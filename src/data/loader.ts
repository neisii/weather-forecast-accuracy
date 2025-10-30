import type { MockWeatherData, CityWeather } from "./types";
import { expandKeys } from "./keyMap";
import mockData from "./mockWeather.json";

let cachedData: MockWeatherData | null = null;

/**
 * Load and expand compressed mock weather data
 *
 * This function loads the compressed JSON file and expands all short keys
 * to their full property names using the KEY_MAP. The result is cached
 * in memory for subsequent calls.
 *
 * @returns Promise resolving to fully expanded mock weather data
 *
 * @example
 * ```typescript
 * const data = await loadMockWeatherData();
 * console.log(data.version); // "1.0"
 * console.log(Object.keys(data.cities)); // ["서울", "부산", ...]
 * ```
 */
export async function loadMockWeatherData(): Promise<MockWeatherData> {
  if (cachedData) {
    return cachedData;
  }

  const compressed = mockData;
  cachedData = expandKeys(compressed) as MockWeatherData;

  return cachedData;
}

/**
 * Get weather data for a specific city
 *
 * Searches for the city in regular cities first, then test cities,
 * and returns the default city data if not found.
 *
 * @param cityName - Name of the city (Korean or English)
 * @returns Promise resolving to city weather data, or null if default is also missing
 *
 * @example
 * ```typescript
 * const seoulWeather = await getMockWeatherByCity('서울');
 * console.log(seoulWeather.current.temperature); // 18
 *
 * const testWeather = await getMockWeatherByCity('테스트_비');
 * console.log(testWeather.weather.description); // "비"
 * ```
 */
export async function getMockWeatherByCity(
  cityName: string,
): Promise<CityWeather | null> {
  const data = await loadMockWeatherData();

  // Check regular cities first
  if (data.cities[cityName]) {
    return data.cities[cityName];
  }

  // Check test cities
  if (data.testCities[cityName]) {
    return data.testCities[cityName];
  }

  // Return default if not found
  return data.default || null;
}

/**
 * Get list of all available city names
 *
 * @param includeTestCities - Whether to include test cities in the result
 * @returns Promise resolving to array of city names
 *
 * @example
 * ```typescript
 * const cities = await getAvailableCities();
 * console.log(cities); // ["서울", "부산", "인천", ...]
 *
 * const allCities = await getAvailableCities(true);
 * console.log(allCities); // ["서울", ..., "테스트_비", "테스트_눈", ...]
 * ```
 */
export async function getAvailableCities(
  includeTestCities = false,
): Promise<string[]> {
  const data = await loadMockWeatherData();

  const regularCities = Object.keys(data.cities);

  if (includeTestCities) {
    const testCities = Object.keys(data.testCities);
    return [...regularCities, ...testCities];
  }

  return regularCities;
}

/**
 * Validate mock weather data structure
 *
 * Checks if the loaded data has the required structure and all
 * necessary properties.
 *
 * @returns Promise resolving to validation result
 *
 * @example
 * ```typescript
 * const isValid = await validateMockData();
 * if (!isValid) {
 *   console.error('Mock data is invalid!');
 * }
 * ```
 */
export async function validateMockData(): Promise<boolean> {
  try {
    const data = await loadMockWeatherData();

    // Check version exists
    if (!data.version) {
      console.error("Mock data missing version");
      return false;
    }

    // Check cities exist
    if (!data.cities || Object.keys(data.cities).length === 0) {
      console.error("Mock data missing cities");
      return false;
    }

    // Check default exists
    if (!data.default) {
      console.error("Mock data missing default city");
      return false;
    }

    // Validate structure of one city
    const firstCity = Object.values(data.cities)[0];
    if (!firstCity) {
      console.error("Mock data has no cities");
      return false;
    }
    if (!firstCity.location || !firstCity.current || !firstCity.weather) {
      console.error("Mock data city structure invalid");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating mock data:", error);
    return false;
  }
}

/**
 * Clear cached mock data
 *
 * Useful for testing or forcing a reload of the data.
 *
 * @example
 * ```typescript
 * clearCache();
 * const freshData = await loadMockWeatherData(); // Will reload from JSON
 * ```
 */
export function clearCache(): void {
  cachedData = null;
}
