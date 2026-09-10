// scripts/fetchCityLandmarks.js
// This script queries the OpenStreetMap Overpass API to retrieve points of interest
// for Yaoundé and Douala, then writes them into src/data/cityData.js as CITY_LANDMARKS.

import fs from 'fs';
import path from 'path';
import https from 'https';

const overpassQuery = (city) => `
[out:json][timeout:25];
(
  node["name"](around:50000,${city.lat},${city.lon});
  way["name"](around:50000,${city.lat},${city.lon});
  relation["name"](around:50000,${city.lat},${city.lon});
);
out center;`;

const cities = {
  "Yaoundé": { lat: 3.8667, lon: 11.5167 },
  "Douala": { lat: 4.0511, lon: 9.7679 },
};

function fetchOSM(cityName, coords) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(overpassQuery(coords));
    const url = `https://overpass-api.de/api/interpreter?data=${query}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function transformElements(elements) {
  const landmarks = [];
  for (const el of elements) {
    const name = el.tags?.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;
    const category = el.tags?.amenity || el.tags?.shop || el.tags?.tourism || el.tags?.leisure || el.tags?.building || 'landmark';
    landmarks.push({ name, pos: [lat, lon], category, district: el.tags?.addr?.city || '', desc: el.tags?.description || '' });
  }
  return landmarks;
}

(async () => {
  const cityLandmarks = {};
  for (const [cityName, coord] of Object.entries(cities)) {
    console.log(`Fetching data for ${cityName}…`);
    const result = await fetchOSM(cityName, coord);
    cityLandmarks[cityName] = transformElements(result.elements);
    console.log(`Found ${cityLandmarks[cityName].length} items for ${cityName}`);
  }
  // Load existing cityData.js content
  const cityDataPath = path.resolve('src/data/cityData.js');
  let fileContent = fs.readFileSync(cityDataPath, 'utf8');
  // Replace the CITY_LANDMARKS export block
  const newExport = `export const CITY_LANDMARKS = ${JSON.stringify(cityLandmarks, null, 2)};`;
  fileContent = fileContent.replace(/export const CITY_LANDMARKS[\s\S]*?;/, newExport);
  fs.writeFileSync(cityDataPath, fileContent, 'utf8');
  console.log('cityData.js updated with fresh landmarks.');
})();
