import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../../models/traffic_node.dart';
import '../../models/incident_alert.dart';
import '../../models/citizen_report.dart';
import '../../models/citizen_reward.dart';
import '../../models/emergency_mission.dart';
import '../../models/smart_route.dart';
import '../constants/city_data.dart';

class CityFlowMobileApiService {
  // Liste des hôtes candidats pour s'adapter automatiquement à :
  // 1. Android physique avec reverse ADB ou IP locale Wi-Fi (192.168.1.123)
  // 2. Émulateur Android (10.0.2.2)
  // 3. Web & Desktop (localhost / 127.0.0.1)
  static const List<String> _candidateHosts = [
    'http://127.0.0.1:3000/api',
    'http://192.168.1.123:3000/api',
    'http://10.0.2.2:3000/api',
    'http://localhost:3000/api',
  ];

  static String _activeBaseUrl = 'http://127.0.0.1:3000/api';

  static String get baseUrl => _activeBaseUrl;

  static void setBaseUrl(String url) {
    _activeBaseUrl = url;
  }

  /// Récupération des nœuds de trafic avec repli automatique sur CityData si offline
  static Future<List<TrafficNode>> fetchTrafficNodes(String city) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/traffic/nodes?city=${Uri.encodeComponent(city)}');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          final List nodesJson = data['nodes'] ?? [];
          if (nodesJson.isNotEmpty) {
            return nodesJson.map((item) => TrafficNode.fromJson(item as Map<String, dynamic>)).toList();
          }
        }
      } catch (_) {}
    }

    return city == 'Yaoundé' ? CityData.getYaoundeNodes() : CityData.getDoualaNodes();
  }

  /// Récupération des alertes
  static Future<List<IncidentAlert>> fetchAlerts(String city) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/alerts?city=${Uri.encodeComponent(city)}');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
        }
      } catch (_) {}
    }

    return CityData.getInitialAlerts().where((a) => a.city == city).toList();
  }

  /// Récupération des signalements citoyens
  static Future<List<CitizenReport>> fetchCitizenReports(String city) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports?city=${Uri.encodeComponent(city)}');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          final List reportsJson = data['reports'] ?? [];
          return reportsJson.map((item) => CitizenReport.fromJson(item as Map<String, dynamic>)).toList();
        }
      } catch (_) {}
    }

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
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    final pos = position ?? const LatLng(3.8480, 11.5021);
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports');
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
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['report'] != null) {
            return CitizenReport.fromJson(data['report'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// Voter pour un signalement
  static Future<CitizenReport?> voteCitizenReport(String reportId, String voteType) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports/$reportId/vote');
        final response = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: json.encode({'voteType': voteType}),
        ).timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['report'] != null) {
            return CitizenReport.fromJson(data['report'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// Profil Citoyen & Récompenses
  static Future<CitizenProfileData?> fetchCitizenProfile() async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/rewards/profile');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['profile'] != null) {
            return CitizenProfileData.fromJson(data['profile'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }

    return const CitizenProfileData(
      userId: 'citizen_paul',
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
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/rewards/catalog');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          final List list = data['catalog'] ?? [];
          return list.map((item) => CatalogRewardItem.fromJson(item as Map<String, dynamic>)).toList();
        }
      } catch (_) {}
    }

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
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/rewards/redeem');
        final response = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: json.encode({'rewardId': rewardId}),
        ).timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['redemption'] != null) {
            return RewardCoupon.fromJson(data['redemption'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }
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
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/emergency/dispatch');
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
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['mission'] != null) {
            return EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// Obtenir la mission d'urgence active
  static Future<EmergencyMission?> fetchActiveEmergencyMission(String city) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/emergency/active?city=${Uri.encodeComponent(city)}');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['active'] == true && data['mission'] != null) {
            return EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// Avancer l'onde verte (step suivant)
  static Future<EmergencyMission?> stepEmergencyMission() async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/emergency/step');
        final response = await http.post(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['missionCompleted'] == true) {
            return null;
          }
          if (data['mission'] != null) {
            return EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// Annuler la mission d'urgence
  static Future<bool> cancelEmergencyMission() async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/emergency/cancel');
        final response = await http.post(uri).timeout(const Duration(seconds: 2));
        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  /// Prévisions IA multi-horizons avec météo et simulations
  static Future<Map<String, dynamic>?> fetchAiForecast({
    required String city,
    String weather = 'dry',
    int? hour,
  }) async {
    final targetHour = hour ?? DateTime.now().hour;
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/ai/forecast?city=${Uri.encodeComponent(city)}&weather=${Uri.encodeComponent(weather)}&hour=$targetHour');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return json.decode(response.body) as Map<String, dynamic>;
        }
      } catch (_) {}
    }

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

  /// Recherche dynamique de lieux et routes à Yaoundé et Douala (Nominatim OpenStreetMap + Catalogue enrichi)
  static Future<List<CityLandmark>> searchPlaces({
    required String query,
    required String city,
    LatLng? userPos,
  }) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) {
      return CityData.getLandmarks(city);
    }

    final queryLower = cleanQuery.toLowerCase();
    final results = <CityLandmark>[];
    final seenNames = <String>{};

    // 1. Essayer via le backend CityFlow /api/routes/search-places
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse(
          '$host/routes/search-places?q=${Uri.encodeComponent(cleanQuery)}&city=${Uri.encodeComponent(city)}'
          '${userPos != null ? '&userLat=${userPos.latitude}&userLng=${userPos.longitude}' : ''}',
        );
        final response = await http.get(uri).timeout(const Duration(seconds: 3));
        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          final List list = data['results'] ?? [];
          if (list.isNotEmpty) {
            for (final item in list) {
              final name = item['name'] ?? item['displayName'] ?? '';
              final posList = item['position'] as List?;
              if (name.isNotEmpty && posList != null && posList.length == 2) {
                final pos = LatLng((posList[0] as num).toDouble(), (posList[1] as num).toDouble());
                if (!seenNames.contains(name.toLowerCase())) {
                  seenNames.add(name.toLowerCase());
                  results.add(CityLandmark(
                    name: name,
                    pos: pos,
                    category: item['category'] ?? 'landmark',
                    district: item['district'] ?? city,
                    desc: item['desc'] ?? item['displayName'] ?? '',
                  ));
                }
              }
            }
            if (results.isNotEmpty) return results;
          }
        }
      } catch (_) {}
    }

    // 2. Recherche locale instantanée dans CityData (0ms de latence)
    final localLandmarks = CityData.getLandmarks(city);
    for (final l in localLandmarks) {
      if (l.name.toLowerCase().contains(queryLower) ||
          l.district.toLowerCase().contains(queryLower) ||
          l.desc.toLowerCase().contains(queryLower) ||
          l.category.toLowerCase().contains(queryLower)) {
        if (!seenNames.contains(l.name.toLowerCase())) {
          seenNames.add(l.name.toLowerCase());
          results.add(l);
        }
      }
    }

    // 3. Appel direct OpenStreetMap Nominatim si besoin de résultats géographiques additionnels
    try {
      final viewbox = city == 'Douala'
          ? '9.600,4.180,9.880,3.950'
          : '11.350,3.980,11.650,3.750';

      final nominatimUri = Uri.parse(
        'https://nominatim.openstreetmap.org/search?format=json&q=${Uri.encodeComponent('$cleanQuery $city Cameroon')}&countrycodes=cm&viewbox=$viewbox&bounded=0&addressdetails=1&limit=10',
      );

      final response = await http.get(
        nominatimUri,
        headers: {
          'User-Agent': 'CityFlow-App/1.0 (contact@cityflow.cm)',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final List osmData = json.decode(response.body);
        for (final item in osmData) {
          final lat = double.tryParse(item['lat']?.toString() ?? '');
          final lon = double.tryParse(item['lon']?.toString() ?? '');
          if (lat != null && lon != null) {
            final name = item['name']?.toString().isNotEmpty == true
                ? item['name'].toString()
                : (item['display_name']?.toString().split(',').first ?? 'Lieu');
            final addr = item['address'] as Map<String, dynamic>?;
            final district = addr?['suburb'] ?? addr?['neighbourhood'] ?? addr?['quarter'] ?? city;
            final type = item['type']?.toString() ?? 'landmark';

            String cat = 'landmark';
            if (type.contains('hospital') || type.contains('clinic') || type.contains('pharmacy')) {
              cat = 'hospital';
            } else if (type.contains('school') || type.contains('university') || type.contains('college')) {
              cat = 'university';
            } else if (type.contains('supermarket') || type.contains('mall') || type.contains('market')) {
              cat = 'mall';
            } else if (type.contains('hotel')) {
              cat = 'hotel';
            } else if (type.contains('station') || type.contains('aerodrome')) {
              cat = 'transport';
            }

            if (!seenNames.contains(name.toLowerCase())) {
              seenNames.add(name.toLowerCase());
              results.add(CityLandmark(
                name: name,
                pos: LatLng(lat, lon),
                category: cat,
                district: district.toString(),
                desc: item['display_name']?.toString() ?? '',
              ));
            }
          }
        }
      }
    } catch (_) {}

    return results.isNotEmpty ? results : localLandmarks;
  }

  /// Calcul d'itinéraires multi-critères et comparateur multimodal (OSRM Réel & Segments Trafic)
  static Future<Map<String, dynamic>> calculateSmartRoutes({
    required String city,
    required dynamic origin,
    required dynamic destination,
  }) async {
    // Résolution précise des coordonnées
    final startPos = origin is LatLng
        ? origin
        : (origin.toString().toLowerCase().contains('position') || origin.toString().toLowerCase().contains('gps')
            ? (city == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter)
            : (CityData.findLandmark(city, origin.toString())?.pos ??
                (city == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter)));
    final endPos = destination is LatLng
        ? destination
        : (destination.toString().toLowerCase().contains('position') || destination.toString().toLowerCase().contains('point')
            ? (city == 'Yaoundé' ? const LatLng(3.8890, 11.5120) : const LatLng(4.0430, 9.6910))
            : (CityData.findLandmark(city, destination.toString())?.pos ??
                (city == 'Yaoundé' ? const LatLng(3.8890, 11.5120) : const LatLng(4.0430, 9.6910))));

    final destLabel = destination is LatLng ? 'Destination sélectionnée' : destination.toString();
    final originLabel = origin is LatLng ? 'Point de départ' : origin.toString();

    // 1. Essayer d'abord via le backend CityFlow
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/routes/calculate');
        final response = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'city': city,
            'origin': origin is LatLng ? [origin.latitude, origin.longitude] : origin,
            'destination': destination is LatLng ? [destination.latitude, destination.longitude] : destination,
            'originCoords': [startPos.latitude, startPos.longitude],
            'destinationCoords': [endPos.latitude, endPos.longitude],
          }),
        ).timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          final List rawRoutes = data['routes'] ?? [];
          final List rawMulti = data['multimodal'] ?? [];

          final routes = rawRoutes.map((r) => SmartRoute.fromJson(r as Map<String, dynamic>)).toList();
          final multimodal = rawMulti.map((m) => MultimodalOption.fromJson(m as Map<String, dynamic>)).toList();

          if (routes.isNotEmpty) {
            return {
              'routes': routes,
              'multimodal': multimodal,
            };
          }
        }
      } catch (_) {}
    }

    // 2. Si backend hors-ligne, appeler directement l'API OSRM (OpenStreetMap) pour obtenir le tracé routier réel
    final osrmRoutes = await _fetchDirectOsrmRoutes(startPos, endPos, originLabel, destLabel);
    if (osrmRoutes != null && osrmRoutes.isNotEmpty) {
      return {
        'routes': osrmRoutes,
        'multimodal': _buildMultimodalOptions(osrmRoutes.first.distanceKm, osrmRoutes.first.durationMinutes),
      };
    }

    // 3. Repli de secours local avec coordonnées géométriques lissées
    return _buildLocalFallbackRoutes(startPos, endPos, originLabel, destLabel);
  }

  /// Appel direct à l'API OSRM (OpenStreetMap Routing Machine) depuis l'application mobile
  static Future<List<SmartRoute>?> _fetchDirectOsrmRoutes(
    LatLng start,
    LatLng end,
    String originLabel,
    String destLabel,
  ) async {
    try {
      final uri = Uri.parse(
        'https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson&steps=true&alternatives=true',
      );

      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['code'] == 'Ok' && data['routes'] != null && (data['routes'] as List).isNotEmpty) {
          final rawRoutes = data['routes'] as List;
          final smartRoutes = <SmartRoute>[];

          for (int idx = 0; idx < min(3, rawRoutes.length); idx++) {
            final r = rawRoutes[idx];
            final distKm = double.parse(((r['distance'] as num) / 1000.0).toStringAsFixed(1));
            final durMin = max(3, ((r['duration'] as num) / 60.0).round());
            final coordsList = (r['geometry']?['coordinates'] as List?)
                    ?.map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()))
                    .toList() ??
                [];

            if (coordsList.isEmpty) continue;

            final steps = _parseOsrmSteps(r['legs']?[0]?['steps'] as List?, destLabel, coordsList);
            final segments = _buildTrafficSegments(coordsList, idx == 0 ? 1.3 : (idx == 1 ? 0.9 : 1.1));

            if (idx == 0) {
              smartRoutes.add(SmartRoute(
                id: 'route_fastest',
                type: 'fastest',
                title: 'Itinéraire Direct Réel (OSRM / OpenStreetMap)',
                badge: '⚡ Recommandé CityFlow',
                tag: 'Temps optimal',
                durationMinutes: durMin,
                distanceKm: distKm,
                delaySavedMinutes: max(2, (durMin * 0.35).round()),
                co2SavedKg: 0.40,
                ecoScore: 'B+',
                congestionIndex: 30,
                color: const Color(0xFF00875A),
                fluidityLevel: 'fluid',
                highlights: const ['Réseau routier réel vérifié', 'Contourne les axes saturés'],
                coordinates: coordsList,
                trafficSegments: segments,
                steps: steps,
              ));
            } else if (idx == 1) {
              smartRoutes.add(SmartRoute(
                id: 'route_eco',
                type: 'eco',
                title: 'Variante Fluide Réelle (OSRM)',
                badge: '🌿 Eco-Score A+ (-35% CO2)',
                tag: 'Faible émission',
                durationMinutes: durMin + 2,
                distanceKm: distKm,
                delaySavedMinutes: max(1, (durMin * 0.2).round()),
                co2SavedKg: 0.85,
                ecoScore: 'A+',
                congestionIndex: 20,
                color: const Color(0xFF10B981),
                fluidityLevel: 'fluid',
                highlights: const ['Vitesse constante sans arrêt', 'Économie de carburant'],
                coordinates: coordsList,
                trafficSegments: segments,
                steps: steps,
              ));
            } else {
              smartRoutes.add(SmartRoute(
                id: 'route_secure',
                type: 'secure',
                title: 'Variante Grands Boulevards (OSRM)',
                badge: '🛡️ Chaussée large & Éclairée',
                tag: 'Sécurité max',
                durationMinutes: durMin + 3,
                distanceKm: distKm,
                delaySavedMinutes: 0,
                co2SavedKg: 0.20,
                ecoScore: 'B',
                congestionIndex: 38,
                color: const Color(0xFF3B82F6),
                fluidityLevel: 'moderate',
                highlights: const ['Grandes voies bitumées', 'Éclairage public continu'],
                coordinates: coordsList,
                trafficSegments: segments,
                steps: steps,
              ));
            }
          }

          // Si OSRM n'a renvoyé qu'une route, générer les 2 variantes sécurisées et éco
          if (smartRoutes.length == 1) {
            final base = smartRoutes.first;
            final ecoCoords = _generateSmoothCoordinates(start, end, 1, pointCount: 36);
            final secureCoords = _generateSmoothCoordinates(start, end, 2, pointCount: 36);

            smartRoutes.add(SmartRoute(
              id: 'route_eco',
              type: 'eco',
              title: 'Via Rocade de Contournement Fluide',
              badge: '🌿 Eco-Score A+ (-35% CO2)',
              tag: 'Faible émission',
              durationMinutes: base.durationMinutes + 2,
              distanceKm: double.parse((base.distanceKm * 1.1).toStringAsFixed(1)),
              delaySavedMinutes: 3,
              co2SavedKg: 0.90,
              ecoScore: 'A+',
              congestionIndex: 22,
              color: const Color(0xFF10B981),
              fluidityLevel: 'fluid',
              highlights: const ['Vitesse stabilisée sans arrêts fréquents', 'Économie de carburant maximale'],
              coordinates: ecoCoords,
              trafficSegments: _buildTrafficSegments(ecoCoords, 0.9),
              steps: [
                RouteStepInstruction(
                  instruction: 'Départ en éco-conduite fluide',
                  distance: '500 m',
                  rawDistanceMeters: 500,
                  action: 'depart',
                  icon: 'navigation',
                  maneuverIcon: 'navigation',
                  spokenText: 'Départ en allure modérée.',
                  position: ecoCoords.first,
                ),
                RouteStepInstruction(
                  instruction: 'Prendre la rocade de contournement',
                  distance: '${(base.distanceKm * 0.7).toStringAsFixed(1)} km',
                  rawDistanceMeters: (base.distanceKm * 700).round(),
                  action: 'turn',
                  icon: 'arrow-up-left',
                  maneuverIcon: 'arrow-up-left',
                  spokenText: 'Prenez à gauche sur la rocade.',
                  position: ecoCoords[ecoCoords.length ~/ 2],
                ),
                RouteStepInstruction(
                  instruction: 'Arrivée à destination : $destLabel',
                  distance: '200 m',
                  rawDistanceMeters: 200,
                  action: 'arrive',
                  icon: 'map-pin',
                  maneuverIcon: 'map-pin',
                  spokenText: 'Vous êtes arrivé à votre destination.',
                  position: ecoCoords.last,
                ),
              ],
            ));

            smartRoutes.add(SmartRoute(
              id: 'route_secure',
              type: 'secure',
              title: 'Via Grands Boulevards Éclairés',
              badge: '🛡️ Voie large & Éclairée',
              tag: 'Sécurité max',
              durationMinutes: base.durationMinutes + 4,
              distanceKm: double.parse((base.distanceKm * 1.15).toStringAsFixed(1)),
              delaySavedMinutes: 0,
              co2SavedKg: 0.20,
              ecoScore: 'B',
              congestionIndex: 35,
              color: const Color(0xFF3B82F6),
              fluidityLevel: 'moderate',
              highlights: const ['Chaussée bitumée en parfait état', 'Éclairage public continu'],
              coordinates: secureCoords,
              trafficSegments: _buildTrafficSegments(secureCoords, 1.1),
              steps: [
                RouteStepInstruction(
                  instruction: 'Départ sur la voie prioritaire',
                  distance: '400 m',
                  rawDistanceMeters: 400,
                  action: 'depart',
                  icon: 'navigation',
                  maneuverIcon: 'navigation',
                  spokenText: 'Départ sur la grande avenue.',
                  position: secureCoords.first,
                ),
                RouteStepInstruction(
                  instruction: 'Continuer tout droit sur la voie principale',
                  distance: '${(base.distanceKm * 0.8).toStringAsFixed(1)} km',
                  rawDistanceMeters: (base.distanceKm * 800).round(),
                  action: 'straight',
                  icon: 'straight',
                  maneuverIcon: 'straight',
                  spokenText: 'Poursuivez tout droit sur la voie principale.',
                  position: secureCoords[secureCoords.length ~/ 2],
                ),
                RouteStepInstruction(
                  instruction: 'Arrivée à destination : $destLabel',
                  distance: '200 m',
                  rawDistanceMeters: 200,
                  action: 'arrive',
                  icon: 'map-pin',
                  maneuverIcon: 'map-pin',
                  spokenText: 'Vous êtes arrivé à votre destination.',
                  position: secureCoords.last,
                ),
              ],
            ));
          }

          return smartRoutes;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Découpeur d'itinéraire en segments de trafic fluides, modérés et denses
  static List<TrafficSegment> _buildTrafficSegments(List<LatLng> coordinates, double congestionMultiplier) {
    if (coordinates.length < 2) return [];
    final segments = <TrafficSegment>[];
    final total = coordinates.length;
    final chunkCount = min(5, max(3, total ~/ 6));
    final chunkSize = max(2, total ~/ chunkCount);

    for (int i = 0; i < total - 1; i += chunkSize - 1) {
      final slice = coordinates.sublist(i, min(total, i + chunkSize));
      if (slice.length < 2) continue;

      final ratio = i / total;
      String status = 'fluid';
      Color color = const Color(0xFF10B981);
      double speed = 48.0;
      int percent = 15;
      String label = 'Axe dégagé';

      if (ratio > 0.25 && ratio < 0.65) {
        if (congestionMultiplier > 1.25) {
          status = 'heavy';
          color = const Color(0xFFEF4444);
          speed = 12.0;
          percent = 82;
          label = 'Carrefour dense / Ralentissement';
        } else {
          status = 'moderate';
          color = const Color(0xFFF59E0B);
          speed = 26.0;
          percent = 45;
          label = 'Ralentissement modéré';
        }
      } else if (ratio >= 0.65 && ratio < 0.85) {
        status = 'moderate';
        color = const Color(0xFFF59E0B);
        speed = 32.0;
        percent = 35;
        label = 'Trafic régulier';
      }

      segments.add(TrafficSegment(
        coordinates: slice,
        status: status,
        color: color,
        speedKmh: speed,
        congestionPercent: percent,
        label: label,
      ));
    }
    return segments;
  }

  /// Parser des étapes OSRM en étapes de navigation compréhensibles en français
  static List<RouteStepInstruction> _parseOsrmSteps(
    List? rawSteps,
    String destLabel,
    List<LatLng> coords,
  ) {
    if (rawSteps == null || rawSteps.isEmpty) {
      return [
        RouteStepInstruction(
          instruction: 'Prendre le départ vers $destLabel',
          distance: '400 m',
          rawDistanceMeters: 400,
          action: 'depart',
          icon: 'navigation',
          maneuverIcon: 'navigation',
          spokenText: 'Départ immédiat. Suivez l\'itinéraire affiché sur la carte.',
          position: coords.isNotEmpty ? coords.first : null,
        ),
        RouteStepInstruction(
          instruction: 'Continuer tout droit sur la voie principale',
          distance: '1.2 km',
          rawDistanceMeters: 1200,
          action: 'straight',
          icon: 'traffic-light',
          maneuverIcon: 'traffic-light',
          spokenText: 'Poursuivez tout droit sur votre voie.',
          position: coords.length > 5 ? coords[coords.length ~/ 2] : null,
        ),
        RouteStepInstruction(
          instruction: 'Vous êtes arrivé à destination : $destLabel',
          distance: '150 m',
          rawDistanceMeters: 150,
          action: 'arrive',
          icon: 'map-pin',
          maneuverIcon: 'map-pin',
          spokenText: 'Vous êtes arrivé à votre destination.',
          position: coords.isNotEmpty ? coords.last : null,
        ),
      ];
    }

    final steps = <RouteStepInstruction>[];
    for (int i = 0; i < rawSteps.length; i++) {
      final s = rawSteps[i] as Map<String, dynamic>;
      final man = s['maneuver'] as Map<String, dynamic>? ?? {};
      final type = man['type']?.toString() ?? 'straight';
      final modifier = man['modifier']?.toString() ?? '';
      final streetName = s['name']?.toString() ?? '';
      final distMeters = ((s['distance'] as num?)?.toDouble() ?? 0.0).round();
      final formattedDist = distMeters < 1000 ? '$distMeters m' : '${(distMeters / 1000.0).toStringAsFixed(1)} km';

      String instruction = '';
      String icon = 'straight';

      if (type == 'depart') {
        instruction = streetName.isNotEmpty ? 'Prendre le départ sur $streetName' : 'Prendre le départ vers $destLabel';
        icon = 'navigation';
      } else if (type == 'arrive') {
        instruction = 'Arrivée à destination : $destLabel';
        icon = 'map-pin';
      } else if (modifier.contains('right')) {
        instruction = streetName.isNotEmpty ? 'Tourner à droite sur $streetName' : 'Tourner à droite';
        icon = 'arrow-up-right';
      } else if (modifier.contains('left')) {
        instruction = streetName.isNotEmpty ? 'Tourner à gauche sur $streetName' : 'Tourner à gauche';
        icon = 'arrow-up-left';
      } else if (type == 'roundabout') {
        final exit = man['exit'] ?? 2;
        instruction = streetName.isNotEmpty
            ? 'Au rond-point, prendre la ${exit}e sortie sur $streetName'
            : 'Au rond-point, prendre la ${exit}e sortie';
        icon = 'rotate-cw';
      } else {
        instruction = streetName.isNotEmpty ? 'Continuer tout droit sur $streetName' : 'Continuer tout droit';
        icon = 'straight';
      }

      final coordIdx = (i / max(1, rawSteps.length - 1) * (coords.length - 1)).round().clamp(0, coords.length - 1);
      final stepPos = coords.isNotEmpty ? coords[coordIdx] : null;

      steps.add(RouteStepInstruction(
        instruction: instruction,
        distance: formattedDist,
        rawDistanceMeters: distMeters,
        action: type,
        icon: icon,
        maneuverIcon: icon,
        spokenText: 'Dans $formattedDist, ${instruction.toLowerCase()}',
        position: stepPos,
      ));
    }
    return steps;
  }

  static List<MultimodalOption> _buildMultimodalOptions(double distKm, int durationMin) {
    return [
      MultimodalOption(
        mode: 'car',
        label: 'Voiture',
        icon: 'car',
        durationMinutes: durationMin,
        estimatedCostFcfa: (distKm * 95 + 400).round(),
        costLabel: '~${(distKm * 95 + 400).round()} FCFA',
        co2Kg: (distKm * 0.18).toStringAsFixed(2),
        comfort: 'Climatisé',
      ),
      MultimodalOption(
        mode: 'mototaxi',
        label: 'Moto-taxi (Benskin)',
        icon: 'bike',
        durationMinutes: max(4, (durationMin * 0.65).round()),
        estimatedCostFcfa: (distKm * 70 + 200).round(),
        costLabel: '${(distKm * 70 + 200).round()} FCFA',
        co2Kg: (distKm * 0.08).toStringAsFixed(2),
        comfort: 'Agilité maximale',
        isFastest: true,
      ),
      MultimodalOption(
        mode: 'taxi',
        label: 'Taxi Jaune Collectif',
        icon: 'bus',
        durationMinutes: (durationMin * 1.3 + 5).round(),
        estimatedCostFcfa: 350,
        costLabel: '300 - 500 FCFA',
        co2Kg: (distKm * 0.06).toStringAsFixed(2),
        comfort: 'Économique',
      ),
      MultimodalOption(
        mode: 'walking',
        label: 'À pied (Santé)',
        icon: 'walk',
        durationMinutes: (distKm * 12.5).round(),
        estimatedCostFcfa: 0,
        costLabel: 'Gratuit',
        co2Kg: '0.00',
        caloriesKcal: (distKm * 65).round(),
        comfort: 'Activité physique',
      ),
    ];
  }

  static Map<String, dynamic> _buildLocalFallbackRoutes(
    LatLng startPos,
    LatLng endPos,
    String originLabel,
    String destLabel,
  ) {
    final fastestCoords = _generateSmoothCoordinates(startPos, endPos, 0, pointCount: 36);
    final ecoCoords = _generateSmoothCoordinates(startPos, endPos, 1, pointCount: 36);
    final secureCoords = _generateSmoothCoordinates(startPos, endPos, 2, pointCount: 36);

    final dLat = (endPos.latitude - startPos.latitude).abs() * 111.0;
    final dLng = (endPos.longitude - startPos.longitude).abs() * 111.0;
    final directDist = sqrt(dLat * dLat + dLng * dLng);
    final fastestDist = double.parse(max(1.2, directDist * 1.15).toStringAsFixed(1));
    final fastestMin = max(6, (fastestDist * 2.6).round());

    final ecoDist = double.parse((fastestDist * 1.12).toStringAsFixed(1));
    final ecoMin = fastestMin + 2;

    final secureDist = double.parse((fastestDist * 1.18).toStringAsFixed(1));
    final secureMin = fastestMin + 3;

    return {
      'routes': [
        SmartRoute(
          id: 'route_fastest',
          type: 'fastest',
          title: 'Via Axe Principal & Voie Rapide',
          badge: '⚡ Recommandé CityFlow',
          tag: 'Temps optimal',
          durationMinutes: fastestMin,
          distanceKm: fastestDist,
          delaySavedMinutes: 8,
          co2SavedKg: 0.4,
          ecoScore: 'B+',
          congestionIndex: 28,
          color: const Color(0xFF00875A),
          fluidityLevel: 'fluid',
          highlights: const ['Contourne les axes saturés', 'Régulation des feux favorable'],
          coordinates: fastestCoords,
          trafficSegments: _buildTrafficSegments(fastestCoords, 1.3),
          steps: [
            RouteStepInstruction(
              instruction: 'Prendre le départ vers $destLabel',
              distance: '400 m',
              rawDistanceMeters: 400,
              action: 'depart',
              icon: 'navigation',
              maneuverIcon: 'navigation',
              spokenText: 'Départ immédiat. Suivez l\'itinéraire affiché sur la carte.',
              position: fastestCoords.first,
            ),
            RouteStepInstruction(
              instruction: 'Tourner à droite sur l\'axe principal vers $destLabel',
              distance: '${(fastestDist * 0.4).toStringAsFixed(1)} km',
              rawDistanceMeters: (fastestDist * 400).round(),
              action: 'turn',
              icon: 'arrow-up-right',
              maneuverIcon: 'arrow-up-right',
              spokenText: 'Dans 400 mètres, tournez à droite sur l\'axe principal.',
              position: fastestCoords[12],
            ),
            RouteStepInstruction(
              instruction: 'Continuer tout droit au carrefour régulé',
              distance: '${(fastestDist * 0.4).toStringAsFixed(1)} km',
              rawDistanceMeters: (fastestDist * 400).round(),
              action: 'straight',
              icon: 'traffic-light',
              maneuverIcon: 'traffic-light',
              spokenText: 'Feu vert synchronisé. Poursuivez tout droit sur votre voie.',
              position: fastestCoords[24],
            ),
            RouteStepInstruction(
              instruction: 'Arrivée à destination : $destLabel',
              distance: '150 m',
              rawDistanceMeters: 150,
              action: 'arrive',
              icon: 'map-pin',
              maneuverIcon: 'map-pin',
              spokenText: 'Vous êtes arrivé à votre destination.',
              position: fastestCoords.last,
            ),
          ],
        ),
        SmartRoute(
          id: 'route_eco',
          type: 'eco',
          title: 'Via Rocade de Contournement Fluide',
          badge: '🌿 Eco-Score A+ (-35% CO2)',
          tag: 'Faible émission',
          durationMinutes: ecoMin,
          distanceKm: ecoDist,
          delaySavedMinutes: 4,
          co2SavedKg: 0.95,
          ecoScore: 'A+',
          congestionIndex: 18,
          color: const Color(0xFF10B981),
          fluidityLevel: 'fluid',
          highlights: const ['Vitesse stabilisée sans arrêts fréquents', 'Économie carburant maximale'],
          coordinates: ecoCoords,
          trafficSegments: _buildTrafficSegments(ecoCoords, 0.9),
          steps: [
            RouteStepInstruction(
              instruction: 'Prendre le départ en éco-conduite',
              distance: '500 m',
              rawDistanceMeters: 500,
              action: 'depart',
              icon: 'navigation',
              maneuverIcon: 'navigation',
              spokenText: 'Départ en allure modérée.',
              position: ecoCoords.first,
            ),
            RouteStepInstruction(
              instruction: 'Prendre la rocade de contournement fluide',
              distance: '${(ecoDist * 0.7).toStringAsFixed(1)} km',
              rawDistanceMeters: (ecoDist * 700).round(),
              action: 'turn',
              icon: 'arrow-up-left',
              maneuverIcon: 'arrow-up-left',
              spokenText: 'Prenez à gauche sur la rocade fluide.',
              position: ecoCoords[14],
            ),
            RouteStepInstruction(
              instruction: 'Arrivée à destination : $destLabel',
              distance: '150 m',
              rawDistanceMeters: 150,
              action: 'arrive',
              icon: 'map-pin',
              maneuverIcon: 'map-pin',
              spokenText: 'Vous êtes arrivé à votre destination.',
              position: ecoCoords.last,
            ),
          ],
        ),
        SmartRoute(
          id: 'route_secure',
          type: 'secure',
          title: 'Via Boulevard Éclairé & Grande Avenue',
          badge: '🛡️ Voie large & Éclairée',
          tag: 'Sécurité max',
          durationMinutes: secureMin,
          distanceKm: secureDist,
          delaySavedMinutes: 0,
          co2SavedKg: 0.2,
          ecoScore: 'B',
          congestionIndex: 35,
          color: const Color(0xFF3B82F6),
          fluidityLevel: 'moderate',
          highlights: const ['Chaussée bitumée en parfait état', 'Éclairage public continu'],
          coordinates: secureCoords,
          trafficSegments: _buildTrafficSegments(secureCoords, 1.1),
          steps: [
            RouteStepInstruction(
              instruction: 'Départ sur voie prioritaire',
              distance: '400 m',
              rawDistanceMeters: 400,
              action: 'depart',
              icon: 'navigation',
              maneuverIcon: 'navigation',
              spokenText: 'Départ sur la grande avenue éclairée.',
              position: secureCoords.first,
            ),
            RouteStepInstruction(
              instruction: 'Continuer tout droit sur la voie principale',
              distance: '${(secureDist * 0.7).toStringAsFixed(1)} km',
              rawDistanceMeters: (secureDist * 700).round(),
              action: 'straight',
              icon: 'straight',
              maneuverIcon: 'straight',
              spokenText: 'Poursuivez tout droit sur la voie principale.',
              position: secureCoords[16],
            ),
            RouteStepInstruction(
              instruction: 'Arrivée sécurisée à destination',
              distance: '200 m',
              rawDistanceMeters: 200,
              action: 'arrive',
              icon: 'map-pin',
              maneuverIcon: 'map-pin',
              spokenText: 'Vous êtes arrivé à destination.',
              position: secureCoords.last,
            ),
          ],
        ),
      ],
      'multimodal': _buildMultimodalOptions(fastestDist, fastestMin),
    };
  }

  static List<LatLng> _generateSmoothCoordinates(LatLng start, LatLng end, int variant, {int pointCount = 36}) {
    final list = <LatLng>[];
    for (int i = 0; i <= pointCount; i++) {
      final ratio = i / pointCount;
      final lat = start.latitude + (end.latitude - start.latitude) * ratio;
      final lng = start.longitude + (end.longitude - start.longitude) * ratio;

      double latOffset = 0.0;
      double lngOffset = 0.0;

      if (variant == 0) {
        latOffset = sin(ratio * pi) * 0.0035 + sin(ratio * 4 * pi) * 0.0006;
        lngOffset = cos(ratio * pi) * 0.0025 + cos(ratio * 3 * pi) * 0.0004;
      } else if (variant == 1) {
        latOffset = -sin(ratio * pi) * 0.006 + sin(ratio * 3 * pi) * 0.0005;
        lngOffset = sin(ratio * pi) * 0.005 + cos(ratio * 2 * pi) * 0.0004;
      } else {
        latOffset = cos(ratio * pi) * 0.005 + sin(ratio * 2 * pi) * 0.0008;
        lngOffset = -sin(ratio * pi) * 0.006 + cos(ratio * 3 * pi) * 0.0005;
      }

      if (i == 0) {
        list.add(start);
      } else if (i == pointCount) {
        list.add(end);
      } else {
        list.add(LatLng(lat + latOffset, lng + lngOffset));
      }
    }
    return list;
  }
}
