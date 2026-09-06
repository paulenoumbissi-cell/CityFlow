/**
 * Service Météorologique Réel & Prédictif CityFlow
 * Connecté à l'API Open-Meteo haute précision pour Yaoundé et Douala.
 * Gère le temps réel, les prévisions horaires (pluie mm, probabilité, WMO codes) et le cache.
 */

const CITY_COORDINATES = {
  yaounde: {
    name: "Yaoundé",
    latitude: 3.8480,
    longitude: 11.5021,
    elevation: 750,
  },
  douala: {
    name: "Douala",
    latitude: 4.0511,
    longitude: 9.7679,
    elevation: 13,
  },
};

// Cache en mémoire (TTL: 10 minutes)
const weatherCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Traduction des codes WMO météorologiques standard
 */
export function parseWmoCode(code, rainMm = 0) {
  if (rainMm >= 25 || code === 95 || code === 96 || code === 99) {
    return {
      conditionKey: rainMm >= 40 ? "flood" : "heavy_rain",
      label: rainMm >= 40 ? "Inondation / Chaussée submergée" : "Orage tropical violent",
      icon: rainMm >= 40 ? "🌊" : "⛈️",
      speedFactor: rainMm >= 40 ? 0.32 : 0.55,
      congestionMultiplier: rainMm >= 40 ? 2.35 : 1.75,
      description: rainMm >= 40
        ? "Bas-fonds inondés, caniveaux débordés. Franchissement critique au pas ou déviations."
        : "Violentes averses, visibilité réduite, flaques profondes et risque d'aquaplaning.",
    };
  }

  if (code >= 80 && code <= 82) {
    return {
      conditionKey: "heavy_rain",
      label: "Averses orageuses soutenues",
      icon: "🌧️",
      speedFactor: 0.60,
      congestionMultiplier: 1.65,
      description: "Averses denses, chaussée détrempée et trafic fortement ralenti.",
    };
  }

  if ((code >= 51 && code <= 65) || rainMm > 0) {
    return {
      conditionKey: "light_rain",
      label: "Pluie fine / Bruine humide",
      icon: "🌦️",
      speedFactor: 0.82,
      congestionMultiplier: 1.25,
      description: "Chaussée glissante, visibilité réduite, freinage anticipé.",
    };
  }

  if (code === 45 || code === 48) {
    return {
      conditionKey: "dry",
      label: "Brume matinale",
      icon: "🌫️",
      speedFactor: 0.90,
      congestionMultiplier: 1.10,
      description: "Légère brume, adhérence normale.",
    };
  }

  if (code === 1 || code === 2 || code === 3) {
    return {
      conditionKey: "dry",
      label: "Nuageux / Temps clément",
      icon: "⛅",
      speedFactor: 1.0,
      congestionMultiplier: 1.0,
      description: "Couverture nuageuse sans intempéries. Circulation normale.",
    };
  }

  return {
    conditionKey: "dry",
    label: "Temps sec / Ensoleillé",
    icon: "☀️",
    speedFactor: 1.0,
    congestionMultiplier: 1.0,
    description: "Conditions de circulation optimales et adhérence routière maximale.",
  };
}

/**
 * Récupération brute des données Open-Meteo pour une ville
 */
export async function fetchLiveWeatherData(cityName = "Yaoundé") {
  const isDouala = cityName.toLowerCase().includes("douala");
  const cityKey = isDouala ? "douala" : "yaounde";
  const coords = CITY_COORDINATES[cityKey];

  const cacheKey = `weather_${cityKey}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,rain,weather_code&timezone=auto&forecast_days=2`;
    
    const response = await fetch(url, {
      headers: { "User-Agent": "CityFlow-TrafficAI/2.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const json = await response.json();
    const current = json.current || {};
    const hourly = json.hourly || {};

    const currentRain = current.rain ?? current.precipitation ?? 0;
    const currentWmo = current.weather_code ?? 0;
    const parsedCurrent = parseWmoCode(currentWmo, currentRain);

    // Construction de la série horaire
    const hourlyList = [];
    if (hourly.time && Array.isArray(hourly.time)) {
      const times = hourly.time;
      for (let i = 0; i < Math.min(times.length, 24); i++) {
        const timeStr = times[i];
        const dateObj = new Date(timeStr);
        const hour = dateObj.getHours();
        const rainMm = hourly.rain ? hourly.rain[i] : 0;
        const prob = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
        const temp = hourly.temperature_2m ? hourly.temperature_2m[i] : 25;
        const code = hourly.weather_code ? hourly.weather_code[i] : 0;
        const parsed = parseWmoCode(code, rainMm);

        hourlyList.push({
          time: timeStr,
          hour,
          temperature: Math.round(temp),
          rainMm: Math.round(rainMm * 10) / 10,
          precipitationProbability: prob,
          weatherCode: code,
          conditionKey: parsed.conditionKey,
          label: parsed.label,
          icon: parsed.icon,
          description: parsed.description,
        });
      }
    }

    const result = {
      city: coords.name,
      coordinates: { latitude: coords.latitude, longitude: coords.longitude },
      timestamp: new Date().toISOString(),
      isLive: true,
      current: {
        temperature: Math.round(current.temperature_2m ?? 26),
        apparentTemperature: Math.round(current.apparent_temperature ?? 27),
        humidity: current.relative_humidity_2m ?? 75,
        rainMm: Math.round(currentRain * 10) / 10,
        windSpeedKmh: Math.round((current.wind_speed_10m ?? 8) * 10) / 10,
        weatherCode: currentWmo,
        conditionKey: parsedCurrent.conditionKey,
        label: parsedCurrent.label,
        icon: parsedCurrent.icon,
        description: parsedCurrent.description,
        speedFactor: parsedCurrent.speedFactor,
        congestionMultiplier: parsedCurrent.congestionMultiplier,
      },
      hourly: hourlyList,
    };

    weatherCache.set(cacheKey, { timestamp: now, data: result });
    return result;
  } catch (error) {
    console.warn(`[WeatherService] Erreur API Open-Meteo (${cityName}):`, error.message);
    
    // Fallback réaliste si connexion indisponible
    const currentHour = new Date().getHours();
    const isRainyHour = currentHour >= 15 && currentHour <= 18; // Fréquent à Yaoundé/Douala
    const fallbackParsed = parseWmoCode(isRainyHour ? 53 : 1, isRainyHour ? 2.5 : 0);

    return {
      city: coords.name,
      coordinates: { latitude: coords.latitude, longitude: coords.longitude },
      timestamp: new Date().toISOString(),
      isLive: false,
      fallback: true,
      current: {
        temperature: 25,
        apparentTemperature: 27,
        humidity: 80,
        rainMm: isRainyHour ? 2.5 : 0,
        windSpeedKmh: 10,
        weatherCode: isRainyHour ? 53 : 1,
        conditionKey: fallbackParsed.conditionKey,
        label: fallbackParsed.label,
        icon: fallbackParsed.icon,
        description: fallbackParsed.description,
        speedFactor: fallbackParsed.speedFactor,
        congestionMultiplier: fallbackParsed.congestionMultiplier,
      },
      hourly: Array.from({ length: 12 }, (_, idx) => {
        const h = (currentHour + idx) % 24;
        const willRain = h >= 15 && h <= 18;
        return {
          time: new Date(Date.now() + idx * 3600000).toISOString(),
          hour: h,
          temperature: willRain ? 23 : 26,
          rainMm: willRain ? 4.0 : 0,
          precipitationProbability: willRain ? 75 : 15,
          weatherCode: willRain ? 61 : 1,
          conditionKey: willRain ? "light_rain" : "dry",
          label: willRain ? "Pluie d'après-midi" : "Temps sec",
          icon: willRain ? "🌦️" : "☀️",
          description: willRain ? "Chaussée glissante" : "Conditions normales",
        };
      }),
    };
  }
}

/**
 * Récupère la météo exacte prévue pour une heure précise (ex: 17h)
 */
export async function getForecastForHour(cityName = "Yaoundé", targetHour = new Date().getHours()) {
  const weatherData = await fetchLiveWeatherData(cityName);
  const normalizedHour = Math.floor(targetHour) % 24;

  const foundHourly = weatherData.hourly.find((item) => item.hour === normalizedHour);
  if (foundHourly) {
    return {
      hour: normalizedHour,
      temperature: foundHourly.temperature,
      rainMm: foundHourly.rainMm,
      precipitationProbability: foundHourly.precipitationProbability,
      conditionKey: foundHourly.conditionKey,
      label: foundHourly.label,
      icon: foundHourly.icon,
      description: foundHourly.description,
      speedFactor: parseWmoCode(foundHourly.weatherCode, foundHourly.rainMm).speedFactor,
      congestionMultiplier: parseWmoCode(foundHourly.weatherCode, foundHourly.rainMm).congestionMultiplier,
      isLive: weatherData.isLive,
    };
  }

  // Fallback si l'heure est au-delà du cache
  return {
    hour: normalizedHour,
    temperature: weatherData.current.temperature,
    rainMm: weatherData.current.rainMm,
    precipitationProbability: weatherData.current.rainMm > 0 ? 80 : 20,
    conditionKey: weatherData.current.conditionKey,
    label: weatherData.current.label,
    icon: weatherData.current.icon,
    description: weatherData.current.description,
    speedFactor: weatherData.current.speedFactor,
    congestionMultiplier: weatherData.current.congestionMultiplier,
    isLive: weatherData.isLive,
  };
}
