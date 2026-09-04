import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../../models/traffic_node.dart';
import '../../models/incident_alert.dart';
import '../../models/citizen_report.dart';
import '../../models/citizen_reward.dart';
import '../../models/emergency_mission.dart';
import '../constants/city_data.dart';

class CityFlowMobileApiService {
  // Détection de l'hôte (10.0.2.2 pour émulateur Android, localhost pour Desktop/iOS)
  static String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  /// Récupération des nœuds de trafic avec repli automatique sur CityData si offline
  static Future<List<TrafficNode>> fetchTrafficNodes(String city) async {
    try {
      final uri = Uri.parse('$baseUrl/traffic/nodes?city=${Uri.encodeComponent(city)}');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List nodesJson = data['nodes'] ?? [];
        if (nodesJson.isNotEmpty) {
          return nodesJson.map((item) {
            final List pos = item['position'] ?? [3.8666, 11.5167];
            final String congestionStr = item['currentCongestion'] ?? 'moderate';
            CongestionLevel level = CongestionLevel.moderate;
            if (congestionStr == 'jammed') {
              level = CongestionLevel.jammed;
            } else if (congestionStr == 'heavy') {
              level = CongestionLevel.heavy;
            } else if (congestionStr == 'fluid') {
              level = CongestionLevel.fluid;
            }

            final List predsJson = item['predictions'] ?? [];
            final predictions = predsJson.map((p) => TrafficPrediction(
              hourOffset: p['hourOffset'] ?? 1,
              congestionPercentage: (p['congestionPercentage'] ?? 50).toDouble(),
              label: p['label'] ?? '+1h',
              weatherInfluence: p['weatherInfluence'] ?? 'Normal',
            )).toList();

            return TrafficNode(
              id: item['id'] ?? 'node_${DateTime.now().millisecondsSinceEpoch}',
              name: item['name'] ?? 'Carrefour',
              city: item['city'] ?? city,
              position: LatLng((pos[0] as num).toDouble(), (pos[1] as num).toDouble()),
              currentCongestion: level,
              averageSpeedKmh: (item['averageSpeedKmh'] ?? 25.0).toDouble(),
              estimatedDelayMinutes: item['estimatedDelayMinutes'] ?? 5,
              vehicleCountPerHour: item['vehicleCountPerHour'] ?? 1500,
              predictions: predictions,
            );
          }).toList();
        }
      }
    } catch (_) {
      // Mode hors-ligne / fallback local immédiat
    }

    return city == 'Yaoundé' ? CityData.getYaoundeNodes() : CityData.getDoualaNodes();
  }

  /// Récupération des alertes
  static Future<List<IncidentAlert>> fetchAlerts(String city) async {
    try {
      final uri = Uri.parse('$baseUrl/alerts?city=${Uri.encodeComponent(city)}');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        // En cas de succès, on pourrait parser les alertes de l'API
      }
    } catch (_) {}

    return CityData.getInitialAlerts().where((a) => a.city == city).toList();
  }

  /// Récupération des signalements citoyens
  static Future<List<CitizenReport>> fetchCitizenReports(String city) async {
    try {
      final uri = Uri.parse('$baseUrl/reports?city=${Uri.encodeComponent(city)}');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List reportsJson = data['reports'] ?? [];
        return reportsJson.map((item) => CitizenReport.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {}

    // Fallback local
    return [
      CitizenReport(
        id: 'rep_local_1',
        author: 'Marc T.',
        city: city,
        category: CitizenReportCategory.accident,
        title: 'Accident léger sans gravité',
        locationDescription: 'Voie droite après le carrefour',
        position: const LatLng(3.8825, 11.5175),
        severity: CitizenReportSeverity.high,
        reportedAt: DateTime.now().subtract(const Duration(minutes: 15)),
        confirmationsCount: 3,
        isVerified: true,
      ),
      CitizenReport(
        id: 'rep_local_2',
        author: 'Sophie M.',
        city: city,
        category: CitizenReportCategory.roadworks,
        title: 'Nid de poule signalé par les usagers',
        locationDescription: 'Face station service',
        position: const LatLng(3.8680, 11.5210),
        severity: CitizenReportSeverity.moderate,
        reportedAt: DateTime.now().subtract(const Duration(minutes: 40)),
        confirmationsCount: 1,
        isVerified: false,
      ),
    ];
  }

  /// Envoi d'un nouveau signalement citoyen
  static Future<CitizenReport?> submitCitizenReport({
    required String title,
    required String city,
    required String locationDescription,
    required CitizenReportCategory category,
    required CitizenReportSeverity severity,
    LatLng? position,
    String? author,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/reports');
      final pos = position ?? const LatLng(3.8480, 11.5021);
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'title': title,
          'city': city,
          'locationDescription': locationDescription,
          'category': category.name,
          'severity': severity.name,
          'position': [pos.latitude, pos.longitude],
          'author': author ?? 'Paul Enoumbissi',
        }),
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['report'] != null) {
          return CitizenReport.fromJson(data['report'] as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Vote sur un signalement (+1 confirmation ou résolution)
  static Future<bool> voteReport(String reportId, String type) async {
    try {
      final uri = Uri.parse('$baseUrl/reports/$reportId/vote');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'type': type, 'userId': 'user_current'}),
      ).timeout(const Duration(seconds: 3));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Profil citoyen et gamification
  static Future<CitizenProfileData> fetchCitizenProfile() async {
    try {
      final uri = Uri.parse('$baseUrl/rewards/profile');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        return CitizenProfileData.fromJson(data);
      }
    } catch (_) {}

    return const CitizenProfileData(
      userId: 'user_current',
      userName: 'Paul Enoumbissi',
      reputationScore: 320,
      reportsCount: 8,
      confirmationsGiven: 14,
      level: CitizenLevel(
        number: 3,
        title: 'Guide de la Cité',
        badgeIcon: '🗺️',
        minPoints: 301,
        maxPoints: 700,
        progressPercentage: 55,
      ),
      badges: [
        CitizenBadge(id: '1', title: 'Première Sentinelle', description: 'Premier signalement', icon: '🛡️', unlockedAt: null),
        CitizenBadge(id: '2', title: 'Éco-Citoyen', description: 'Contribution active', icon: '🌱', unlockedAt: null),
      ],
      redeemedRewards: [],
    );
  }

  /// Catalogue des récompenses
  static Future<List<CatalogRewardItem>> fetchRewardsCatalog() async {
    try {
      final uri = Uri.parse('$baseUrl/rewards/catalog');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List list = data['catalog'] ?? [];
        return list.map((item) => CatalogRewardItem.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {}

    return const [
      CatalogRewardItem(
        id: 'reward_parking_1h',
        title: '1 Heure de Parking Gratuit',
        partner: 'Parkings Municipaux',
        category: 'parking',
        costPoints: 150,
        icon: '🅿️',
        description: 'Valable dans tous les parkings partenaires.',
      ),
      CatalogRewardItem(
        id: 'reward_bike_pass',
        title: 'Pass 24h Vélo Libre-service',
        partner: 'CityBike Express',
        category: 'micromobility',
        costPoints: 200,
        icon: '🚲',
        description: 'Trajets illimités de 30 min sur la flotte urbaine.',
      ),
      CatalogRewardItem(
        id: 'reward_coffee_break',
        title: 'Pause Café Offerte',
        partner: 'Stations TotalEnergies',
        category: 'lifestyle',
        costPoints: 100,
        icon: '☕',
        description: 'Un café chaud dans les stations partenaires.',
      ),
    ];
  }

  /// Échange de récompense
  static Future<RewardCoupon?> redeemReward(String rewardId) async {
    try {
      final uri = Uri.parse('$baseUrl/rewards/redeem');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'rewardId': rewardId}),
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['redemption'] != null) {
          return RewardCoupon.fromJson(data['redemption'] as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Déclencher une mission d'urgence (Onde Verte)
  static Future<EmergencyMission?> dispatchEmergencyMission({
    required String vehicleType,
    required String city,
    String? corridorId,
    String? origin,
    String? destination,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/emergency/dispatch');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'vehicleType': vehicleType,
          'city': city,
          'corridorId': corridorId,
          'origin': origin,
          'destination': destination,
        }),
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['mission'] != null) {
          return EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Obtenir la mission d'urgence active
  static Future<EmergencyMission?> fetchActiveEmergencyMission(String city) async {
    try {
      final uri = Uri.parse('$baseUrl/emergency/active?city=${Uri.encodeComponent(city)}');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['active'] == true && data['mission'] != null) {
          return EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Avancer l'onde verte (step suivant)
  static Future<EmergencyMission?> stepEmergencyMission() async {
    try {
      final uri = Uri.parse('$baseUrl/emergency/step');
      final response = await http.post(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['missionCompleted'] == true) {
          return null;
        }
        if (data['mission'] != null) {
          return EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Annuler la mission d'urgence
  static Future<bool> cancelEmergencyMission() async {
    try {
      final uri = Uri.parse('$baseUrl/emergency/cancel');
      final response = await http.post(uri).timeout(const Duration(seconds: 3));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Prévisions IA multi-horizons avec météo et simulations
  static Future<Map<String, dynamic>?> fetchAiForecast({
    required String city,
    String weather = 'dry',
    int? hour,
  }) async {
    final targetHour = hour ?? DateTime.now().hour;
    try {
      final uri = Uri.parse('$baseUrl/ai/forecast?city=${Uri.encodeComponent(city)}&weather=${Uri.encodeComponent(weather)}&hour=$targetHour');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}

    // Fallback local
    return {
      'city': city,
      'aiModel': 'CityFlow-NeuralTraffic v2.4 (Hors-Ligne)',
      'globalForecast': [
        {'horizon': '+15 min', 'congestionPercentage': 45, 'status': 'Modéré'},
        {'horizon': '+30 min', 'congestionPercentage': 62, 'status': 'Modéré'},
        {'horizon': '+1 heure', 'congestionPercentage': 82, 'status': 'Critique'},
        {'horizon': '+2 heures', 'congestionPercentage': 68, 'status': 'Modéré'},
        {'horizon': '+3 heures', 'congestionPercentage': 35, 'status': 'Fluide'},
      ],
      'recommendations': [
        {
          'title': 'Conseil IA Proactif',
          'message': 'Anticipez un départ d\'ici 15 minutes pour éviter l\'engorgement des grands carrefours.',
          'badge': 'OPTIMISATION IA',
        }
      ],
      'anomalies': [
        {
          'nodeName': 'Axe Principal',
          'type': 'FLUX_NOMINAL',
          'description': 'Circulation conforme aux modèles d\'apprentissage.',
        }
      ]
    };
  }
}
