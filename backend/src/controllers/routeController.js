export const calculateRoute = (req, res) => {
  const { origin = "Position actuelle", destination = "Centre-ville", strategy = "fastest" } = req.body;

  const routes = [
    {
      id: "route_fastest",
      type: "fastest",
      title: "Itinéraire le plus rapide (Recommandé par CityFlow)",
      durationMinutes: 22,
      distanceKm: 6.8,
      delaySavedMinutes: 14,
      co2SavedKg: 0.8,
      congestionIndex: 35,
      color: "#00875A",
      steps: [
        `Départ depuis ${origin}`,
        "Prendre la direction Boulevard du 20 Mai (1,2 km)",
        "Tourner à droite vers Axe Bastos / Ambassades (3,4 km)",
        `Arrivée à destination (${destination}) dans 22 min`,
      ],
    },
    {
      id: "route_shortest",
      type: "shortest",
      title: "Itinéraire le plus court",
      durationMinutes: 36,
      distanceKm: 5.1,
      delaySavedMinutes: 0,
      co2SavedKg: 0.2,
      congestionIndex: 78,
      color: "#F59E0B",
      steps: [
        `Départ depuis ${origin}`,
        "Traverser le Carrefour Nlongkak (Ralentissement sévère)",
        `Arrivée à ${destination}`,
      ],
    },
    {
      id: "route_eco",
      type: "eco",
      title: "Itinéraire Éco-responsable",
      durationMinutes: 26,
      distanceKm: 6.2,
      delaySavedMinutes: 8,
      co2SavedKg: 1.2,
      congestionIndex: 42,
      color: "#10B981",
      steps: [
        `Départ depuis ${origin}`,
        "Contournement par voies secondaires fluides",
        `Arrivée à ${destination}`,
      ],
    },
  ];

  res.json({
    origin,
    destination,
    strategy,
    calculatedAt: new Date().toISOString(),
    routes,
  });
};
