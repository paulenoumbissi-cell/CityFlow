import 'package:latlong2/latlong.dart';
import '../../models/traffic_node.dart';
import '../../models/incident_alert.dart';
import '../../models/priority_route.dart';
import '../../models/community_driver.dart';

class CityLandmark {
  final String name;
  final LatLng pos;
  final String category; // 'landmark', 'hospital', 'transport', 'mall', 'hotel', 'university'
  final String district;
  final String desc;

  String get id => name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '_');

  const CityLandmark({
    required this.name,
    required this.pos,
    required this.category,
    required this.district,
    required this.desc,
  });
}

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
        vehicleCountPerHour: 4200,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 98, label: '+1h', weatherInfluence: 'Embouteillage monstre'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 90, label: '+2h', weatherInfluence: 'Activité intense'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 70, label: '+3h', weatherInfluence: 'Décongestion lente'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 40, label: '+6h', weatherInfluence: 'Trafic nocturne'),
        ],
        connectedSegments: const [
          LatLng(4.0435, 9.7420),
          LatLng(4.0380, 9.7580),
          LatLng(4.0470, 9.7270),
        ],
      ),
      TrafficNode(
        id: 'dla_deido',
        name: 'Rond-Point Deido',
        city: 'Douala',
        position: const LatLng(4.0667, 9.7006),
        currentCongestion: CongestionLevel.heavy,
        averageSpeedKmh: 15.0,
        estimatedDelayMinutes: 20,
        vehicleCountPerHour: 2900,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 75, label: '+1h', weatherInfluence: 'Liaison Wouri chargée'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 65, label: '+2h', weatherInfluence: 'Ralentissement modéré'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 45, label: '+3h', weatherInfluence: 'Normalisation'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 25, label: '+6h', weatherInfluence: 'Fluide'),
        ],
        connectedSegments: const [
          LatLng(4.0667, 9.7006),
          LatLng(4.0714, 9.6712),
          LatLng(4.0511, 9.7043),
        ],
      ),
      TrafficNode(
        id: 'dla_akwa',
        name: 'Boulevard de la Liberté (Akwa)',
        city: 'Douala',
        position: const LatLng(4.0511, 9.7043),
        currentCongestion: CongestionLevel.moderate,
        averageSpeedKmh: 22.0,
        estimatedDelayMinutes: 12,
        vehicleCountPerHour: 2100,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 55, label: '+1h', weatherInfluence: 'Zone commerciale active'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 60, label: '+2h', weatherInfluence: 'Commerces ouverts'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 40, label: '+3h', weatherInfluence: 'Fluide'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 20, label: '+6h', weatherInfluence: 'Calme'),
        ],
        connectedSegments: const [
          LatLng(4.0511, 9.7043),
          LatLng(4.0430, 9.6910),
          LatLng(4.0667, 9.7006),
        ],
      ),
      TrafficNode(
        id: 'dla_bonanjo',
        name: 'Place du Gouvernement (Bonanjo)',
        city: 'Douala',
        position: const LatLng(4.0430, 9.6910),
        currentCongestion: CongestionLevel.fluid,
        averageSpeedKmh: 38.0,
        estimatedDelayMinutes: 3,
        vehicleCountPerHour: 1100,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 25, label: '+1h', weatherInfluence: 'Fluide'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 35, label: '+2h', weatherInfluence: 'Sortie bureaux'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 20, label: '+3h', weatherInfluence: 'Très fluide'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 10, label: '+6h', weatherInfluence: 'Quartier administratif calme'),
        ],
        connectedSegments: const [
          LatLng(4.0430, 9.6910),
          LatLng(4.0511, 9.7043),
        ],
      ),
      TrafficNode(
        id: 'dla_bonaberi',
        name: 'Ancien Pont de Bonabéri',
        city: 'Douala',
        position: const LatLng(4.0714, 9.6712),
        currentCongestion: CongestionLevel.heavy,
        averageSpeedKmh: 14.0,
        estimatedDelayMinutes: 25,
        vehicleCountPerHour: 3400,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 85, label: '+1h', weatherInfluence: 'Goulot du pont Wouri'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 75, label: '+2h', weatherInfluence: 'Trafic camions'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 50, label: '+3h', weatherInfluence: 'Dégagement'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 30, label: '+6h', weatherInfluence: 'Modéré'),
        ],
        connectedSegments: const [
          LatLng(4.0714, 9.6712),
          LatLng(4.0667, 9.7006),
        ],
      ),
      TrafficNode(
        id: 'dla_bepanda',
        name: 'Carrefour Bépanda (Omnisports)',
        city: 'Douala',
        position: const LatLng(4.0470, 9.7270),
        currentCongestion: CongestionLevel.jammed,
        averageSpeedKmh: 7.5,
        estimatedDelayMinutes: 32,
        vehicleCountPerHour: 2800,
        predictions: const [
          TrafficPrediction(hourOffset: 1, congestionPercentage: 90, label: '+1h', weatherInfluence: 'Forte densité moto-taxis'),
          TrafficPrediction(hourOffset: 2, congestionPercentage: 80, label: '+2h', weatherInfluence: 'Affluence élevée'),
          TrafficPrediction(hourOffset: 3, congestionPercentage: 55, label: '+3h', weatherInfluence: 'Régulation'),
          TrafficPrediction(hourOffset: 6, congestionPercentage: 25, label: '+6h', weatherInfluence: 'Fluide'),
        ],
        connectedSegments: const [
          LatLng(4.0470, 9.7270),
          LatLng(4.0435, 9.7420),
          LatLng(4.0511, 9.7043),
        ],
      ),
    ];
  }

  // --- INITIAL INCIDENT ALERTS ---
  static List<IncidentAlert> getInitialAlerts() {
    return [
      IncidentAlert(
        id: 'alt_01',
        title: 'Accident Carrefour Nlongkak',
        city: 'Yaoundé',
        locationDescription: 'Sur la voie montante vers Bastos, collision entre 2 véhicules.',
        position: const LatLng(3.8820, 11.5170),
        severity: AlertSeverity.critical,
        category: AlertCategory.accident,
        reportedAt: DateTime.now().subtract(const Duration(minutes: 12)),
        confirmationsCount: 14,
        isVerifiedByAuthority: true,
      ),
      IncidentAlert(
        id: 'alt_02',
        title: 'Chaussée inondée à Ndokotti',
        city: 'Douala',
        locationDescription: 'Fortes pluies torrentielles bloquant le passage sous le pont.',
        position: const LatLng(4.0435, 9.7420),
        severity: AlertSeverity.critical,
        category: AlertCategory.flood,
        reportedAt: DateTime.now().subtract(const Duration(minutes: 25)),
        confirmationsCount: 32,
        isVerifiedByAuthority: true,
      ),
      IncidentAlert(
        id: 'alt_03',
        title: 'Travaux de réfection Mokolo',
        city: 'Yaoundé',
        locationDescription: 'Rétrécissement de voie au niveau du marché Mokolo.',
        position: const LatLng(3.8740, 11.5010),
        severity: AlertSeverity.moderate,
        category: AlertCategory.roadwork,
        reportedAt: DateTime.now().subtract(const Duration(minutes: 45)),
        confirmationsCount: 8,
        isVerifiedByAuthority: false,
      ),
    ];
  }

  // --- PRIORITY EMERGENCY ROUTES ---
  static List<PriorityRoute> getInitialPriorityRoutes() {
    return [
      PriorityRoute(
        id: 'pr_yde_01',
        originName: 'Marché Mokolo (Sapeurs-Pompiers)',
        originPosition: const LatLng(3.8740, 11.5010),
        destinationName: 'Hôpital Général de Yaoundé (Ngousso)',
        destinationPosition: const LatLng(3.8980, 11.5430),
        emergencyType: EmergencyType.ambulance,
        distanceKm: 6.4,
        standardDurationMinutes: 38,
        priorityDurationMinutes: 12,
        timeSavedMinutes: 26,
        corridorDescription: 'Synchronisation onde verte via Bastos Nord -> Dragages -> Ngousso.',
        waypoints: const [
          LatLng(3.8740, 11.5010),
          LatLng(3.8850, 11.5100),
          LatLng(3.8965, 11.5120),
          LatLng(3.8920, 11.5350),
          LatLng(3.8980, 11.5430),
        ],
        checkpoints: const [
          PriorityCheckpoint(
            name: 'Sortie Marché Mokolo',
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

  // --- REPERES & LANDMARKS URBAINS (YAOUNDE & DOUALA) ---
  static List<CityLandmark> getLandmarks(String city) {
    if (city == 'Douala') {
      return doualaLandmarks;
    }
    return yaoundeLandmarks;
  }

  static CityLandmark? findLandmark(String city, String name) {
    final list = getLandmarks(city);
    for (final l in list) {
      if (l.name.toLowerCase() == name.toLowerCase()) {
        return l;
      }
    }
    for (final l in list) {
      if (l.name.toLowerCase().contains(name.toLowerCase()) || name.toLowerCase().contains(l.name.toLowerCase())) {
        return l;
      }
    }
    return null;
  }

  static const List<CityLandmark> yaoundeLandmarks = [
    // --- Carrefours & Quartiers Majeurs ---
    CityLandmark(
      name: 'Poste Centrale',
      pos: LatLng(3.8667, 11.5167),
      category: 'landmark',
      district: 'Centre-Ville',
      desc: 'Boulevard du 20 Mai & Cœur Administratif',
    ),
    CityLandmark(
      name: 'Bastos (Ambassades)',
      pos: LatLng(3.8890, 11.5120),
      category: 'landmark',
      district: 'Bastos',
      desc: 'Zone Diplomatique, Résidences & Restaurants',
    ),
    CityLandmark(
      name: 'Carrefour Nlongkak',
      pos: LatLng(3.8900, 11.5220),
      category: 'landmark',
      district: 'Nlongkak',
      desc: 'Nœud de liaison vers Bastos, Tsinga et Dragages',
    ),
    CityLandmark(
      name: 'Mvan (Gare Voyageurs)',
      pos: LatLng(3.8220, 11.5230),
      category: 'transport',
      district: 'Mvan',
      desc: 'Gare routière interurbaine Axe Sud & Nsimalen',
    ),
    CityLandmark(
      name: 'Carrefour Nsam',
      pos: LatLng(3.8290, 11.5110),
      category: 'landmark',
      district: 'Nsam',
      desc: 'Accès SCDP, Brasseries & Sortie Sud de Yaoundé',
    ),
    CityLandmark(
      name: 'Marché Mokolo',
      pos: LatLng(3.8730, 11.5030),
      category: 'mall',
      district: 'Mokolo',
      desc: 'Grand marché populaire & Carrefour Madagascar',
    ),
    CityLandmark(
      name: 'Carrefour Odza',
      pos: LatLng(3.7990, 11.5230),
      category: 'landmark',
      district: 'Odza',
      desc: 'Route de l\'Aéroport International de Nsimalen',
    ),
    CityLandmark(
      name: 'Ahala (Barrière)',
      pos: LatLng(3.7850, 11.5050),
      category: 'transport',
      district: 'Ahala',
      desc: 'Entrée / Sortie Axe Lourd Douala-Yaoundé (N3)',
    ),
    CityLandmark(
      name: 'Omnisports (Stade Ahmadou Ahidjo)',
      pos: LatLng(3.8810, 11.5360),
      category: 'landmark',
      district: 'Mfandena',
      desc: 'Complexe sportif & Stade de la Réunification',
    ),
    CityLandmark(
      name: 'Rond-point Warda (Mfoundi)',
      pos: LatLng(3.8730, 11.5180),
      category: 'landmark',
      district: 'Centre',
      desc: 'Vallée de la mort, Playce & Liaison Mfoundi',
    ),
    CityLandmark(
      name: 'Carrefour Tsinga (FECAFOOT)',
      pos: LatLng(3.8840, 11.5060),
      category: 'landmark',
      district: 'Tsinga',
      desc: 'Siège FECAFOOT & Grande Mosquée de Tsinga',
    ),
    CityLandmark(
      name: 'Carrefour Emombo',
      pos: LatLng(3.8560, 11.5410),
      category: 'landmark',
      district: 'Emombo',
      desc: 'Liaison Est Yaoundé vers Kondengui et Ekounou',
    ),
    CityLandmark(
      name: 'Carrefour Mendong',
      pos: LatLng(3.8340, 11.4880),
      category: 'landmark',
      district: 'Mendong',
      desc: 'Lycée de Mendong & Liaison vers Simbock',
    ),
    CityLandmark(
      name: 'Carrefour Biyem-Assi (Rond-point Express)',
      pos: LatLng(3.8420, 11.4920),
      category: 'landmark',
      district: 'Biyem-Assi',
      desc: 'Zone commerciale dense & Carrefour Acacias',
    ),
    CityLandmark(
      name: 'Carrefour Etoudi (Palais de l\'Unité)',
      pos: LatLng(3.9180, 11.5320),
      category: 'landmark',
      district: 'Etoudi',
      desc: 'Palais Présidentiel & Axe vers Olembe',
    ),
    CityLandmark(
      name: 'Carrefour Ngousso',
      pos: LatLng(3.8990, 11.5470),
      category: 'landmark',
      district: 'Ngousso',
      desc: 'Carrefour Hôpital Général & Route de Soa',
    ),
    CityLandmark(
      name: 'Carrefour Nkolbisson',
      pos: LatLng(3.8690, 11.4580),
      category: 'landmark',
      district: 'Nkolbisson',
      desc: 'Campus IRAD & Sortie Ouest de la ville',
    ),
    CityLandmark(
      name: 'Carrefour Simbock',
      pos: LatLng(3.8180, 11.4680),
      category: 'landmark',
      district: 'Simbock',
      desc: 'Zone résidentielle & Liaison vers la route de Kribi',
    ),
    CityLandmark(
      name: 'Carrefour Ekounou',
      pos: LatLng(3.8410, 11.5380),
      category: 'landmark',
      district: 'Ekounou',
      desc: 'Palais de Justice & Lycée d\'Ekounou',
    ),
    CityLandmark(
      name: 'Carrefour Mimboman',
      pos: LatLng(3.8680, 11.5580),
      category: 'landmark',
      district: 'Mimboman',
      desc: 'Quartier résidentiel Est Yaoundé',
    ),
    CityLandmark(
      name: 'Carrefour Nkoabang',
      pos: LatLng(3.8720, 11.6020),
      category: 'landmark',
      district: 'Nkoabang',
      desc: 'Sortie Est vers Ayos et Bertoua',
    ),
    CityLandmark(
      name: 'Carrefour Olembe (Stade Paul Biya)',
      pos: LatLng(3.9550, 11.5380),
      category: 'landmark',
      district: 'Olembe',
      desc: 'Grand Complexe Sportif d\'Olembe & Sortie Nord (N4)',
    ),
    CityLandmark(
      name: 'Carrefour Melen',
      pos: LatLng(3.8610, 11.4980),
      category: 'landmark',
      district: 'Melen',
      desc: 'Polytechnique & CHU de Yaoundé',
    ),
    CityLandmark(
      name: 'Carrefour Ngoa-Ekélé',
      pos: LatLng(3.8560, 11.5030),
      category: 'landmark',
      district: 'Ngoa-Ekélé',
      desc: 'Plateau Universitaire & Cité Universitaire',
    ),
    CityLandmark(
      name: 'Carrefour Obili',
      pos: LatLng(3.8590, 11.4880),
      category: 'landmark',
      district: 'Obili',
      desc: 'Zone étudiante & Carrefour Chapelle Obili',
    ),
    CityLandmark(
      name: 'Carrefour Madagascar',
      pos: LatLng(3.8760, 11.4980),
      category: 'landmark',
      district: 'Madagascar',
      desc: 'Accès Mokolo & Quartier populaire historique',
    ),
    CityLandmark(
      name: 'Carrefour Cité Verte',
      pos: LatLng(3.8820, 11.4870),
      category: 'landmark',
      district: 'Cité Verte',
      desc: 'Grand ensemble d\'habitations SIC',
    ),
    CityLandmark(
      name: 'Carrefour Essos',
      pos: LatLng(3.8720, 11.5420),
      category: 'landmark',
      district: 'Essos',
      desc: 'Avenue Germaine & Hôpital de la CNPS',
    ),
    CityLandmark(
      name: 'Carrefour Elig-Essono',
      pos: LatLng(3.8710, 11.5240),
      category: 'landmark',
      district: 'Elig-Essono',
      desc: 'Avenue Kennedy & Gare Camrail',
    ),
    CityLandmark(
      name: 'Carrefour Elig-Edzoa',
      pos: LatLng(3.8880, 11.5290),
      category: 'landmark',
      district: 'Elig-Edzoa',
      desc: 'Marché aux rails & Liaison Omnisports',
    ),
    CityLandmark(
      name: 'Carrefour Emana',
      pos: LatLng(3.9310, 11.5300),
      category: 'landmark',
      district: 'Emana',
      desc: 'Quartier résidentiel Nord Yaoundé',
    ),
    CityLandmark(
      name: 'Carrefour Messassi',
      pos: LatLng(3.9450, 11.5340),
      category: 'landmark',
      district: 'Messassi',
      desc: 'Dispensaire Messassi & Axe Olembe',
    ),
    CityLandmark(
      name: 'Carrefour Santa Barbara',
      pos: LatLng(3.9010, 11.5250),
      category: 'landmark',
      district: 'Santa Barbara',
      desc: 'Quartier résidentiel haut standing',
    ),
    CityLandmark(
      name: 'Carrefour Nkolmesseng',
      pos: LatLng(3.8850, 11.5620),
      category: 'landmark',
      district: 'Nkolmesseng',
      desc: 'Zone collines Est Yaoundé',
    ),
    CityLandmark(
      name: 'Carrefour Damas',
      pos: LatLng(3.8380, 11.5080),
      category: 'landmark',
      district: 'Damas',
      desc: 'Axe de liaison Biyem-Assi vers Nsam',
    ),

    // --- Hôpitaux & Urgences ---
    CityLandmark(
      name: 'Hôpital Central de Yaoundé (CHU)',
      pos: LatLng(3.8650, 11.5080),
      category: 'hospital',
      district: 'Centre',
      desc: 'Grand Centre Hospitalier Universitaire & Urgences 24/7',
    ),
    CityLandmark(
      name: 'Hôpital Général de Yaoundé',
      pos: LatLng(3.8980, 11.5430),
      category: 'hospital',
      district: 'Ngousso',
      desc: 'Pôle Médical Spécialisé & Urgences Nord',
    ),
    CityLandmark(
      name: 'Hôpital Gynéco-Obstétrique (HGOPY)',
      pos: LatLng(3.8410, 11.5620),
      category: 'hospital',
      district: 'Ngousso',
      desc: 'Centre de référence Mère et Enfant',
    ),
    CityLandmark(
      name: 'Centre Pasteur du Cameroun',
      pos: LatLng(3.8690, 11.5150),
      category: 'hospital',
      district: 'Centre',
      desc: 'Laboratoire national & Recherche biomédicale',
    ),
    CityLandmark(
      name: 'Hôpital Militaire de Yaoundé',
      pos: LatLng(3.8590, 11.5160),
      category: 'hospital',
      district: 'Centre',
      desc: 'Hôpital Militaire de Région n°1',
    ),
    CityLandmark(
      name: 'Hôpital de District de Biyem-Assi',
      pos: LatLng(3.8390, 11.4910),
      category: 'hospital',
      district: 'Biyem-Assi',
      desc: 'Hôpital public de référence Sud-Ouest',
    ),

    // --- Enseignement & Grandes Écoles ---
    CityLandmark(
      name: 'Université de Yaoundé I (Ngoa-Ekélé)',
      pos: LatLng(3.8580, 11.5010),
      category: 'university',
      district: 'Ngoa-Ekélé',
      desc: 'Campus universitaire & Faculté des Sciences et Lettres',
    ),
    CityLandmark(
      name: 'École Nationale Polytechnique (ENSP)',
      pos: LatLng(3.8620, 11.4980),
      category: 'university',
      district: 'Melen',
      desc: 'Grande école d\'ingénieurs du Cameroun',
    ),
    CityLandmark(
      name: 'Université de Yaoundé II (Soa)',
      pos: LatLng(3.9550, 11.5950),
      category: 'university',
      district: 'Soa',
      desc: 'Faculté des Sciences Juridiques et Économiques',
    ),
    CityLandmark(
      name: 'Institut des Relations Internationales (IRIC)',
      pos: LatLng(3.8820, 11.5080),
      category: 'university',
      district: 'Obili/Bastos',
      desc: 'École diplomatique d\'excellence',
    ),
    CityLandmark(
      name: 'Institut National de la Jeunesse (INJS)',
      pos: LatLng(3.8780, 11.5320),
      category: 'university',
      district: 'Omnisports',
      desc: 'Pôle national de formation sportive',
    ),

    // --- Transports & Gares ---
    CityLandmark(
      name: 'Aéroport International de Yaoundé-Nsimalen',
      pos: LatLng(3.7220, 11.5530),
      category: 'transport',
      district: 'Nsimalen',
      desc: 'Aéroport International Principal & Hub Aérien',
    ),
    CityLandmark(
      name: 'Gare Ferroviaire de Yaoundé (Camrail)',
      pos: LatLng(3.8690, 11.5270),
      category: 'transport',
      district: 'Elig-Essono',
      desc: 'Hub ferroviaire voyageurs vers Ngaoundéré',
    ),

    // --- Malls & Hôtels ---
    CityLandmark(
      name: 'Hôtel Hilton Yaoundé',
      pos: LatLng(3.8670, 11.5190),
      category: 'hotel',
      district: 'Centre',
      desc: 'Hôtel 5 étoiles de référence internationale',
    ),
    CityLandmark(
      name: 'Hôtel Mont Fébé',
      pos: LatLng(3.9140, 11.5150),
      category: 'hotel',
      district: 'Mont Fébé',
      desc: 'Hôtel panoramique sur les collines de Yaoundé',
    ),
    CityLandmark(
      name: 'Hôtel Djeuga Palace',
      pos: LatLng(3.8680, 11.5170),
      category: 'hotel',
      district: 'Centre',
      desc: 'Hôtel de luxe au cœur des affaires',
    ),
    CityLandmark(
      name: 'Playce Yaoundé (Carrefour Market)',
      pos: LatLng(3.8760, 11.5140),
      category: 'mall',
      district: 'Warda',
      desc: 'Grand centre commercial & Hypermarché Carrefour',
    ),
    CityLandmark(
      name: 'Dovv Bastos',
      pos: LatLng(3.8920, 11.5130),
      category: 'mall',
      district: 'Bastos',
      desc: 'Supermarché moderne et galerie marchande',
    ),
    CityLandmark(
      name: 'Palais Polyvalent des Sports (PAPOSY)',
      pos: LatLng(3.8750, 11.5120),
      category: 'landmark',
      district: 'Warda',
      desc: 'Arène omnisports couverte de 5200 places',
    ),
  ];

  static const List<CityLandmark> doualaLandmarks = [
    // --- Carrefours & Quartiers Majeurs ---
    CityLandmark(
      name: 'Carrefour Akwa (Boulevard Liberté)',
      pos: LatLng(4.0511, 9.7043),
      category: 'landmark',
      district: 'Akwa',
      desc: 'Cœur économique, Boulevard de la Liberté & Boutiques',
    ),
    CityLandmark(
      name: 'Rond-point Deido',
      pos: LatLng(4.0667, 9.7006),
      category: 'landmark',
      district: 'Deido',
      desc: 'Carrefour stratégique vers le Pont sur le Wouri',
    ),
    CityLandmark(
      name: 'Bonanjo (Zone Administrative)',
      pos: LatLng(4.0430, 9.6910),
      category: 'landmark',
      district: 'Bonanjo',
      desc: 'Services publics, Banques, Préfecture & Port Autonome',
    ),
    CityLandmark(
      name: 'Carrefour Ndokoti (Axe Lourd)',
      pos: LatLng(4.0450, 9.7420),
      category: 'landmark',
      district: 'Ndokoti',
      desc: 'Grand carrefour industriel & Nœud d\'échange central',
    ),
    CityLandmark(
      name: 'Carrefour Bonabéri (Ancien Pont)',
      pos: LatLng(4.0714, 9.6712),
      category: 'landmark',
      district: 'Bonabéri',
      desc: 'Porte d\'entrée Ouest de Douala vers le Sud-Ouest',
    ),
    CityLandmark(
      name: 'Carrefour Bépanda (Omnisports)',
      pos: LatLng(4.0470, 9.7270),
      category: 'landmark',
      district: 'Bépanda',
      desc: 'Zone urbaine dense & Stade de la Réunification',
    ),
    CityLandmark(
      name: 'Rond-point Bonamoussadi',
      pos: LatLng(4.0867, 9.7350),
      category: 'landmark',
      district: 'Bonamoussadi',
      desc: 'Centre commercial & Résidentiel Douala Nord',
    ),
    CityLandmark(
      name: 'Carrefour Kotto',
      pos: LatLng(4.0920, 9.7480),
      category: 'landmark',
      district: 'Kotto',
      desc: 'Quartier résidentiel, Lycée de Kotto & Axe Logbessou',
    ),
    CityLandmark(
      name: 'Carrefour Logbessou',
      pos: LatLng(4.1050, 9.7760),
      category: 'landmark',
      district: 'Logbessou',
      desc: 'Campus universitaire & Hôpital Général de Douala',
    ),
    CityLandmark(
      name: 'Carrefour Cité des Palmiers',
      pos: LatLng(4.0610, 9.7680),
      category: 'landmark',
      district: 'Cité des Palmiers',
      desc: 'Zone résidentielle et commerciale Est',
    ),
    CityLandmark(
      name: 'Carrefour New Bell (Marché Nkololoun)',
      pos: LatLng(4.0320, 9.7120),
      category: 'landmark',
      district: 'New Bell',
      desc: 'Grand quartier historique et marché populaire',
    ),
    CityLandmark(
      name: 'Carrefour Makepe (Missoke)',
      pos: LatLng(4.0780, 9.7450),
      category: 'landmark',
      district: 'Makepe',
      desc: 'Quartier résidentiel moderne & Pôle d\'affaires Nord',
    ),
    CityLandmark(
      name: 'Carrefour Yassa (Entrée Est)',
      pos: LatLng(3.9850, 9.7890),
      category: 'landmark',
      district: 'Yassa',
      desc: 'Entrée Autoroute Yaoundé-Douala & Stade de Japoma',
    ),
    CityLandmark(
      name: 'Carrefour Nyalla',
      pos: LatLng(4.0150, 9.7720),
      category: 'landmark',
      district: 'Nyalla',
      desc: 'Zone de transit Axe Lourd Est',
    ),
    CityLandmark(
      name: 'Carrefour PK 14',
      pos: LatLng(4.0820, 9.8050),
      category: 'landmark',
      district: 'PK14',
      desc: 'Zone universitaire & Axe vers Yabassi',
    ),
    CityLandmark(
      name: 'Carrefour Bali',
      pos: LatLng(4.0380, 9.6980),
      category: 'landmark',
      district: 'Bali',
      desc: 'Quartier résidentiel & Cliniques de renom',
    ),
    CityLandmark(
      name: 'Carrefour Bonapriso',
      pos: LatLng(4.0290, 9.6950),
      category: 'landmark',
      district: 'Bonapriso',
      desc: 'Quartier d\'affaires, Résidences & Restaurants',
    ),
    CityLandmark(
      name: 'Carrefour Bessengué',
      pos: LatLng(4.0560, 9.7120),
      category: 'landmark',
      district: 'Bessengué',
      desc: 'Gare ferroviaire centrale Camrail & Marché Mboppi',
    ),
    CityLandmark(
      name: 'Carrefour Logpom (Carrefour Andem)',
      pos: LatLng(4.0890, 9.7620),
      category: 'landmark',
      district: 'Logpom',
      desc: 'Zone résidentielle en plein essor',
    ),
    CityLandmark(
      name: 'Carrefour Japoma (Stade Olympique)',
      pos: LatLng(3.9780, 9.8210),
      category: 'landmark',
      district: 'Japoma',
      desc: 'Grand Stade Omnisports de Japoma (50 000 places)',
    ),
    CityLandmark(
      name: 'Carrefour Denver (Makepe)',
      pos: LatLng(4.0810, 9.7390),
      category: 'landmark',
      district: 'Denver',
      desc: 'Zone résidentielle haut standing',
    ),

    // --- Hôpitaux & Urgences ---
    CityLandmark(
      name: 'Hôpital Laquintinie de Douala',
      pos: LatLng(4.0550, 9.7020),
      category: 'hospital',
      district: 'Akwa/Deido',
      desc: 'Grand Centre Hospitalier Régional & Urgences 24/7',
    ),
    CityLandmark(
      name: 'Hôpital Général de Douala',
      pos: LatLng(4.0620, 9.7480),
      category: 'hospital',
      district: 'Logbessou',
      desc: 'Centre Hospitalier Universitaire de référence nationale',
    ),
    CityLandmark(
      name: 'Hôpital Militaire de Douala',
      pos: LatLng(4.0420, 9.6950),
      category: 'hospital',
      district: 'Bonanjo',
      desc: 'Soins spécialisés et urgences médicales de région',
    ),
    CityLandmark(
      name: 'Clinique Muna',
      pos: LatLng(4.0410, 9.6980),
      category: 'hospital',
      district: 'Bonanjo',
      desc: 'Clinique privée de référence internationale',
    ),
    CityLandmark(
      name: 'Hôpital de District de Bonassama',
      pos: LatLng(4.0750, 9.6640),
      category: 'hospital',
      district: 'Bonabéri',
      desc: 'Hôpital public de référence Douala Ouest',
    ),

    // --- Enseignement & Universités ---
    CityLandmark(
      name: 'Université de Douala (Campus Ndogbong)',
      pos: LatLng(4.0520, 9.7460),
      category: 'university',
      district: 'Ndogbong',
      desc: 'Campus universitaire principal & IUT de Douala',
    ),
    CityLandmark(
      name: 'IUT de Douala',
      pos: LatLng(4.0540, 9.7440),
      category: 'university',
      district: 'Ndogbong',
      desc: 'Institut Universitaire de Technologie',
    ),

    // --- Transports & Aéroports ---
    CityLandmark(
      name: 'Aéroport International de Douala',
      pos: LatLng(4.0060, 9.7190),
      category: 'transport',
      district: 'Aéroport',
      desc: 'Principal aéroport international & Hub fret du Cameroun',
    ),
    CityLandmark(
      name: 'Gare Ferroviaire de Bessengué (Camrail)',
      pos: LatLng(4.0580, 9.7090),
      category: 'transport',
      district: 'Bessengué',
      desc: 'Hub ferroviaire central passagers et marchandises',
    ),
    CityLandmark(
      name: 'Port Autonome de Douala (PAD)',
      pos: LatLng(4.0410, 9.6880),
      category: 'transport',
      district: 'Bonanjo',
      desc: 'Premier port maritime d\'Afrique Centrale',
    ),

    // --- Malls & Hôtels ---
    CityLandmark(
      name: 'Douala Grand Mall (DGM)',
      pos: LatLng(4.0090, 9.7170),
      category: 'mall',
      district: 'Aéroport',
      desc: 'Plus grand centre commercial et de loisirs d\'Afrique Centrale',
    ),
    CityLandmark(
      name: 'L\'Atrium Mall Douala',
      pos: LatLng(4.0490, 9.7030),
      category: 'mall',
      district: 'Akwa',
      desc: 'Centre commercial moderne et supermarché Spar',
    ),
    CityLandmark(
      name: 'Marché Mboppi',
      pos: LatLng(4.0530, 9.7250),
      category: 'mall',
      district: 'Mboppi',
      desc: 'Plus grand marché de négoce et textile d\'Afrique Centrale',
    ),
    CityLandmark(
      name: 'Marché Sandaga',
      pos: LatLng(4.0610, 9.7020),
      category: 'mall',
      district: 'Deido',
      desc: 'Grand marché de vivres frais et produits locaux',
    ),
    CityLandmark(
      name: 'Marché Central de Douala',
      pos: LatLng(4.0380, 9.7110),
      category: 'mall',
      district: 'New Bell',
      desc: 'Marché central historique de Douala',
    ),
    CityLandmark(
      name: 'Hôtel Akwa Palace',
      pos: LatLng(4.0520, 9.7020),
      category: 'hotel',
      district: 'Akwa',
      desc: 'Hôtel 4 étoiles historique au cœur d\'Akwa',
    ),
    CityLandmark(
      name: 'Hôtel Pullman Douala Rabingha',
      pos: LatLng(4.0440, 9.6920),
      category: 'hotel',
      district: 'Bonanjo',
      desc: 'Hôtel de luxe 5 étoiles d\'affaires',
    ),
    CityLandmark(
      name: 'Krystal Palace Douala',
      pos: LatLng(4.0500, 9.7050),
      category: 'hotel',
      district: 'Akwa',
      desc: 'Hôtel 5 étoiles ultra-luxueux',
    ),
    CityLandmark(
      name: 'Onomo Hotel Douala',
      pos: LatLng(4.0350, 9.6940),
      category: 'hotel',
      district: 'Bonanjo',
      desc: 'Hôtel design contemporain',
    ),
  ];

  static List<CommunityDriver> getNearbyDrivers(String city) {
    if (city == 'Yaoundé') {
      return const [
        CommunityDriver(
          id: 'driver_yde_1',
          name: 'Paul E.',
          mood: 'cool',
          moodEmoji: '😎',
          position: LatLng(3.8710, 11.5150),
          speedKmh: 42.0,
          points: 580,
          rank: 'Gardien de la Route',
        ),
        CommunityDriver(
          id: 'driver_yde_2',
          name: 'Marc T.',
          mood: 'speedy',
          moodEmoji: '⚡',
          position: LatLng(3.8850, 11.5190),
          speedKmh: 48.0,
          points: 340,
          rank: 'Conducteur Actif',
        ),
        CommunityDriver(
          id: 'driver_yde_3',
          name: 'Sophie M.',
          mood: 'eco',
          moodEmoji: '🌿',
          position: LatLng(3.8610, 11.5240),
          speedKmh: 35.0,
          points: 820,
          rank: 'Gardien de la Route',
        ),
        CommunityDriver(
          id: 'driver_yde_4',
          name: 'Taxi Yde #24',
          mood: 'taxi',
          moodEmoji: '🚕',
          position: LatLng(3.8780, 11.5080),
          speedKmh: 28.0,
          points: 1450,
          rank: 'Roi de la Route',
        ),
      ];
    } else {
      return const [
        CommunityDriver(
          id: 'driver_dla_1',
          name: 'Christian B.',
          mood: 'cool',
          moodEmoji: '😎',
          position: LatLng(4.0540, 9.7040),
          speedKmh: 44.0,
          points: 620,
          rank: 'Gardien de la Route',
        ),
        CommunityDriver(
          id: 'driver_dla_2',
          name: 'Taxi Douala Express',
          mood: 'taxi',
          moodEmoji: '🚕',
          position: LatLng(4.0460, 9.6950),
          speedKmh: 32.0,
          points: 1120,
          rank: 'Roi de la Route',
        ),
        CommunityDriver(
          id: 'driver_dla_3',
          name: 'Alice K.',
          mood: 'eco',
          moodEmoji: '🌿',
          position: LatLng(4.0620, 9.7120),
          speedKmh: 38.0,
          points: 410,
          rank: 'Conducteur Actif',
        ),
      ];
    }
  }
}
