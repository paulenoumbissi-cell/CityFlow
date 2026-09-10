import { createContext, useContext, useEffect, useState } from 'react';
import wsService from '../services/websocketService';

// Context that holds predictions per city
const PredictionContext = createContext(null);

export const PredictionProvider = ({ children }) => {
  const [predictions, setPredictions] = useState({}); // { city: predictionData }

  useEffect(() => {
    // Ensure the websocket is connected (CityContext already connects)
    // Listen for traffic prediction events
    const unsubscribe = wsService.on('TRAFFIC_PREDICTION', (data) => {
      console.log('[WS] TRAFFIC_PREDICTION event →', data);
      if (data.city && data.prediction) {
        setPredictions((prev) => {
          console.log('[WS] Updating predictions state for city', data.city);
          return { ...prev, [data.city]: data.prediction };
        });
      }
    });

    // ---- Development mock data ----
    // If we are running in development mode and no real data arrives, inject a dummy prediction every few seconds.
    if (process.env.NODE_ENV === 'development') {
      const dummyPrediction = {
        summary: { in15m: 45, in30m: 60, in60m: 75 },
        weather: { temperature: 28, condition: 'Clair', precipitation: 0, windSpeed: 2 },
        globalForecast: [
          { horizon: '+15 min', congestionPercentage: 45, status: '' },
          { horizon: '+30 min', congestionPercentage: 60, status: '' },
          { horizon: '+1 heure', congestionPercentage: 75, status: '' },
        ],
        recommendations: [],
        anomalies: []
      };
      const mockInterval = setInterval(() => {
        console.log('[WS MOCK] emitting dummy prediction for Yaoundé');
        setPredictions((prev) => ({ ...prev, Yaoundé: dummyPrediction }));
      }, 8000);
      // Clean up the mock interval when the provider unmounts.
      return () => {
        clearInterval(mockInterval);
        unsubscribe();
      };
    }
    // ---- End of mock data ----

    // Optional: handle reconnection by re-subscribing city (handled in wsService)
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <PredictionContext.Provider value={predictions}>
      {children}
    </PredictionContext.Provider>
  );
};

export const usePredictions = () => useContext(PredictionContext);
