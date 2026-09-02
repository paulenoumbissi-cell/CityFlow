import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../../models/traffic_node.dart';
import '../../models/incident_alert.dart';
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
