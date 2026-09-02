import 'package:latlong2/latlong.dart';
import '../../models/traffic_node.dart';
import '../../models/incident_alert.dart';
import '../../models/priority_route.dart';

class CityData {
  static const LatLng yaoundeCenter = LatLng(3.8666, 11.5167);
  static const LatLng doualaCenter = LatLng(4.0511, 9.7679);

  // --- YAOUNDÉ NODES ---
  static List<TrafficNode> getYaoundeNodes() {
    return [
      TrafficNode(
        id: 'yde_nlongkak',
        name: 'Carrefour Nlongkak',
        city: 'Yaoundé',
        position: const LatLng(3.8820, 11.5170),
        currentCongestion: CongestionLevel.jammed,
        averageSpeedKmh: 8.5,
        estimatedDelayMinutes: 28,
        vehicleCountPerHour: 2850,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 92, label: '+1h', weatherInfluence: 'Heure de pointe'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 85, label: '+2h', weatherInfluence: 'Trafic intense'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 55, label: '+3h', weatherInfluence: 'Diminution du flux'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 30, label: '+6h', weatherInfluence: 'Fluide en soirée'),
        ],
        connectedSegments: const [
          LatLng(3.8820, 11.5170),
          LatLng(3.8740, 11.5180),
          LatLng(3.8640, 11.5190), // Vers Poste Centrale
        ],
      ),
      TrafficNode(
        id: 'yde_poste_centrale',
        name: 'Poste Centrale (Boulevard du 20 Mai)',
        city: 'Yaoundé',
        position: const LatLng(3.8640, 11.5190),
        currentCongestion: CongestionLevel.heavy,
        averageSpeedKmh: 14.0,
        estimatedDelayMinutes: 19,
        vehicleCountPerHour: 2400,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 78, label: '+1h', weatherInfluence: 'Flux commercial'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 65, label: '+2h', weatherInfluence: 'Modéré'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 45, label: '+3h', weatherInfluence: 'Fluide'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 20, label: '+6h', weatherInfluence: 'Très fluide'),
        ],
        connectedSegments: const [
          LatLng(3.8640, 11.5190),
          LatLng(3.8550, 11.5170),
          LatLng(3.8450, 11.5430), // Vers Emombo
        ],
      ),
      TrafficNode(
        id: 'yde_mokolo',
        name: 'Marché Mokolo (Carrefour Madagascar)',
        city: 'Yaoundé',
        position: const LatLng(3.8740, 11.5010),
        currentCongestion: CongestionLevel.jammed,
        averageSpeedKmh: 6.0,
        estimatedDelayMinutes: 35,
        vehicleCountPerHour: 3100,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 95, label: '+1h', weatherInfluence: 'Marché plein essor'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 88, label: '+2h', weatherInfluence: 'Obstruction marchande'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 60, label: '+3h', weatherInfluence: 'Fermeture boutiques'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 35, label: '+6h', weatherInfluence: 'Voie dégagée'),
        ],
        connectedSegments: const [
          LatLng(3.8740, 11.5010),
          LatLng(3.8680, 11.5120),
          LatLng(3.8640, 11.5190),
        ],
      ),
      TrafficNode(
        id: 'yde_bastos',
        name: 'Carrefour Bastos (Rond-point Bastos)',
        city: 'Yaoundé',
        position: const LatLng(3.8965, 11.5120),
        currentCongestion: CongestionLevel.moderate,
        averageSpeedKmh: 26.0,
        estimatedDelayMinutes: 7,
        vehicleCountPerHour: 1600,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 45, label: '+1h', weatherInfluence: 'Fluide'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 55, label: '+2h', weatherInfluence: 'Sorties bureaux'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 40, label: '+3h', weatherInfluence: 'Normal'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 25, label: '+6h', weatherInfluence: 'Calme'),
        ],
        connectedSegments: const [
          LatLng(3.8965, 11.5120),
          LatLng(3.8820, 11.5170),
        ],
      ),
      TrafficNode(
        id: 'yde_mvan',
        name: 'Carrefour Mvan (Axe Yaoundé-Nsimalen)',
        city: 'Yaoundé',
        position: const LatLng(3.8180, 11.5150),
        currentCongestion: CongestionLevel.heavy,
        averageSpeedKmh: 12.5,
        estimatedDelayMinutes: 22,
        vehicleCountPerHour: 2200,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 80, label: '+1h', weatherInfluence: 'Départs agences interurbaines'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 70, label: '+2h', weatherInfluence: 'Arrivées bus'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 50, label: '+3h', weatherInfluence: 'Régulier'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 30, label: '+6h', weatherInfluence: 'Fluide'),
        ],
        connectedSegments: const [
          LatLng(3.8180, 11.5150),
          LatLng(3.8320, 11.4920),
          LatLng(3.8640, 11.5190),
        ],
      ),
      TrafficNode(
        id: 'yde_emombo',
        name: 'Carrefour Emombo',
        city: 'Yaoundé',
        position: const LatLng(3.8450, 11.5430),
        currentCongestion: CongestionLevel.moderate,
        averageSpeedKmh: 24.0,
        estimatedDelayMinutes: 9,
        vehicleCountPerHour: 1400,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 50, label: '+1h', weatherInfluence: 'Normal'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 60, label: '+2h', weatherInfluence: 'Heure de retour'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 35, label: '+3h', weatherInfluence: 'Fluide'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 15, label: '+6h', weatherInfluence: 'Circulation libre'),
        ],
        connectedSegments: const [
          LatLng(3.8450, 11.5430),
          LatLng(3.8640, 11.5190),
        ],
      ),
    ];
  }

  // --- DOUALA NODES ---
  static List<TrafficNode> getDoualaNodes() {
    return [
      TrafficNode(
        id: 'dla_ndokotti',
        name: 'Carrefour Ndokotti (Cœur névralgique)',
        city: 'Douala',
        position: const LatLng(4.0435, 9.7420),
        currentCongestion: CongestionLevel.jammed,
        averageSpeedKmh: 5.0,
        estimatedDelayMinutes: 45,
        vehicleCountPerHour: 4100,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 98, label: '+1h', weatherInfluence: 'Point de saturation critique'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 90, label: '+2h', weatherInfluence: 'Fort encombrement'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 75, label: '+3h', weatherInfluence: 'Décongestion lente'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 40, label: '+6h', weatherInfluence: 'Trafic nocturne modéré'),
        ],
        connectedSegments: const [
          LatLng(4.0435, 9.7420),
          LatLng(4.0380, 9.7580),
          LatLng(4.0590, 9.7330),
        ],
      ),
      TrafficNode(
        id: 'dla_deido',
        name: 'Rond-Point Deïdo (Carrefour 4 Étages)',
        city: 'Douala',
        position: const LatLng(4.0670, 9.7120),
        currentCongestion: CongestionLevel.heavy,
        averageSpeedKmh: 11.0,
        estimatedDelayMinutes: 26,
        vehicleCountPerHour: 3400,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 86, label: '+1h', weatherInfluence: 'Affluence vers Bonabéri'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 78, label: '+2h', weatherInfluence: 'Ralentissement pont'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 50, label: '+3h', weatherInfluence: 'Déblocage progressif'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 25, label: '+6h', weatherInfluence: 'Fluide'),
        ],
        connectedSegments: const [
          LatLng(4.0670, 9.7120),
          LatLng(4.0750, 9.6820),
          LatLng(4.0510, 9.7040),
        ],
      ),
      TrafficNode(
        id: 'dla_bonaberi',
        name: 'Pont sur le Wouri (Entrée Bonabéri)',
        city: 'Douala',
        position: const LatLng(4.0750, 9.6820),
        currentCongestion: CongestionLevel.heavy,
        averageSpeedKmh: 13.0,
        estimatedDelayMinutes: 30,
        vehicleCountPerHour: 3600,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 89, label: '+1h', weatherInfluence: 'Trafic pendulaire Ouest'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 75, label: '+2h', weatherInfluence: 'Passage continu'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 45, label: '+3h', weatherInfluence: 'Fluide'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 20, label: '+6h', weatherInfluence: 'Dégagé'),
        ],
        connectedSegments: const [
          LatLng(4.0750, 9.6820),
          LatLng(4.0670, 9.7120),
        ],
      ),
      TrafficNode(
        id: 'dla_akwa',
        name: 'Boulevard de la Liberté (Akwa Centre)',
        city: 'Douala',
        position: const LatLng(4.0510, 9.7040),
        currentCongestion: CongestionLevel.moderate,
        averageSpeedKmh: 22.0,
        estimatedDelayMinutes: 12,
        vehicleCountPerHour: 2100,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 58, label: '+1h', weatherInfluence: 'Zone commerciale'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 62, label: '+2h', weatherInfluence: 'Sorties de travail'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 40, label: '+3h', weatherInfluence: 'Normal'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 30, label: '+6h', weatherInfluence: 'Vie nocturne'),
        ],
        connectedSegments: const [
          LatLng(4.0510, 9.7040),
          LatLng(4.0670, 9.7120),
          LatLng(4.0290, 9.7210),
        ],
      ),
      TrafficNode(
        id: 'dla_bassa',
        name: 'Zone Industrielle Bassa (Route de PK10)',
        city: 'Douala',
        position: const LatLng(4.0380, 9.7580),
        currentCongestion: CongestionLevel.jammed,
        averageSpeedKmh: 7.0,
        estimatedDelayMinutes: 38,
        vehicleCountPerHour: 2900,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 91, label: '+1h', weatherInfluence: 'Poids lourds & camions'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 82, label: '+2h', weatherInfluence: 'Engorgement logistique'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 50, label: '+3h', weatherInfluence: 'Fin de rotations'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 25, label: '+6h', weatherInfluence: 'Voie libre'),
        ],
        connectedSegments: const [
          LatLng(4.0380, 9.7580),
          LatLng(4.0435, 9.7420),
        ],
      ),
      TrafficNode(
        id: 'dla_dakar',
        name: 'Carrefour Marché Dakar',
        city: 'Douala',
        position: const LatLng(4.0290, 9.7210),
        currentCongestion: CongestionLevel.moderate,
        averageSpeedKmh: 20.0,
        estimatedDelayMinutes: 15,
        vehicleCountPerHour: 1800,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 55, label: '+1h', weatherInfluence: 'Moyen'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 65, label: '+2h', weatherInfluence: 'Affluence modérée'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 35, label: '+3h', weatherInfluence: 'Fluide'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 20, label: '+6h', weatherInfluence: 'Faible'),
        ],
        connectedSegments: const [
          LatLng(4.0290, 9.7210),
          LatLng(4.0510, 9.7040),
          LatLng(4.0435, 9.7420),
        ],
      ),
    ];
  }

  // --- ALERTS ---
  static List<IncidentAlert> getInitialAlerts() {
    final now = DateTime.now();
    return [
      IncidentAlert(
        id: 'alt_01',
        title: 'Collision multiple à Ndokotti',
        city: 'Douala',
        locationDescription: 'Sous le carrefour Ndokotti vers Bassa, deux camions immobilisés.',
        position: const LatLng(4.0435, 9.7420),
        severity: AlertSeverity.critical,
        category: AlertCategory.accident,
        reportedAt: now.subtract(const Duration(minutes: 18)),
        confirmationsCount: 24,
        isVerifiedByAuthority: true,
      ),
      IncidentAlert(
        id: 'alt_02',
        title: 'Flaque d’eau majeure et nid de poule',
        city: 'Yaoundé',
        locationDescription: 'Descente Nlongkak vers Bata, forte baisse de vitesse des taxis.',
        position: const LatLng(3.8820, 11.5170),
        severity: AlertSeverity.high,
        category: AlertCategory.flooding,
        reportedAt: now.subtract(const Duration(minutes: 42)),
        confirmationsCount: 15,
        isVerifiedByAuthority: false,
      ),
      IncidentAlert(
        id: 'alt_03',
        title: 'Travaux de réfection de la chaussée',
        city: 'Yaoundé',
        locationDescription: 'Axe Boulevard du 20 Mai vers Hilton, circulation sur une seule voie.',
        position: const LatLng(3.8640, 11.5190),
        severity: AlertSeverity.moderate,
        category: AlertCategory.roadworks,
        reportedAt: now.subtract(const Duration(hours: 2, minutes: 10)),
        confirmationsCount: 38,
        isVerifiedByAuthority: true,
      ),
      IncidentAlert(
        id: 'alt_04',
        title: 'Ralentissement dense Pont du Wouri',
        city: 'Douala',
        locationDescription: 'Sens Bonabéri vers Akwa, camion en panne sur la droite.',
        position: const LatLng(4.0750, 9.6820),
        severity: AlertSeverity.high,
        category: AlertCategory.breakdown,
        reportedAt: now.subtract(const Duration(minutes: 27)),
        confirmationsCount: 19,
        isVerifiedByAuthority: true,
      ),
    ];
  }

  // --- PRE-CALCULATED PRIORITY ROUTES ---
  static List<PriorityRoute> getPriorityRoutes() {
    return [
      PriorityRoute(
        id: 'pr_yde_01',
        originName: 'Marché Mokolo',
        originPosition: const LatLng(3.8740, 11.5010),
        destinationName: 'Hôpital Général de Yaoundé (Ngousso)',
        destinationPosition: const LatLng(3.8980, 11.5540),
        emergencyType: EmergencyType.ambulance,
        distanceKm: 8.4,
        standardDurationMinutes: 48,
        priorityDurationMinutes: 19,
        timeSavedMinutes: 29,
        corridorDescription: 'Contournement par Bastos et Tsinga avec onde verte simulée sur Nlongkak.',
        waypoints: const [
          LatLng(3.8740, 11.5010),
          LatLng(3.8850, 11.5050),
          LatLng(3.8965, 11.5120), // Bastos
          LatLng(3.8920, 11.5350),
          LatLng(3.8980, 11.5540), // Hôpital Général
        ],
        checkpoints: const [
          PriorityCheckpoint(
            name: 'Sortie Mokolo - Carrefour Madagascar',
            position: LatLng(3.8740, 11.5010),
            actionRequired: 'Délestage motos-taxis et priorité sirène',
            isCleared: true,
          ),
          PriorityCheckpoint(
            name: 'Rond-Point Bastos',
            position: LatLng(3.8965, 11.5120),
            actionRequired: 'Passage sans arrêt vers axe Ngousso',
            isCleared: true,
          ),
          PriorityCheckpoint(
            name: 'Carrefour Dragages / Ngousso',
            position: LatLng(3.8920, 11.5350),
            actionRequired: 'Priorité feux verts et dégagement urgence',
            isCleared: false,
          ),
        ],
      ),
      PriorityRoute(
        id: 'pr_dla_01',
        originName: 'Zone Industrielle Bassa',
        originPosition: const LatLng(4.0380, 9.7580),
        destinationName: 'Hôpital Laquintinie (Akwa)',
        destinationPosition: const LatLng(4.0560, 9.7080),
        emergencyType: EmergencyType.ambulance,
        distanceKm: 7.9,
        standardDurationMinutes: 52,
        priorityDurationMinutes: 18,
        timeSavedMinutes: 34,
        corridorDescription: 'Évitement du carrefour central Ndokotti via voie de délestage Bassa Sud -> Koumassi.',
        waypoints: const [
          LatLng(4.0380, 9.7580),
          LatLng(4.0320, 9.7450),
          LatLng(4.0290, 9.7210), // Dakar
          LatLng(4.0450, 9.7100),
          LatLng(4.0560, 9.7080), // Hôpital Laquintinie
        ],
        checkpoints: const [
          PriorityCheckpoint(
            name: 'Sortie Zone Bassa',
            position: LatLng(4.0380, 9.7580),
            actionRequired: 'Contournement bifurcation Ndokotti',
            isCleared: true,
          ),
          PriorityCheckpoint(
            name: 'Axe Marché Dakar',
            position: LatLng(4.0290, 9.7210),
            actionRequired: 'Voie express dégagée par forces de l\'ordre',
            isCleared: true,
          ),
          PriorityCheckpoint(
            name: 'Entrée Akwa Nord',
            position: LatLng(4.0450, 9.7100),
            actionRequired: 'Feu prioritaire vers urgences Laquintinie',
            isCleared: false,
          ),
        ],
      ),
    ];
  }
}
