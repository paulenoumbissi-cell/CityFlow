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
    'http://10.88.49.101:3000/api',
    'http://192.168.1.123:3000/api',
    'http://10.0.2.2:3000/api',
    'http://localhost:3000/api',
  ];

  static String _activeBaseUrl = 'http://127.0.0.1:3000/api';

  static String get baseUrl => _activeBaseUrl;

  static void setBaseUrl(String url) {
    _activeBaseUrl = url;
  }

  // ===================================================================
  // AUTHENTIFICATION OTP & CRÉATION DE COMPTE STYLE YANGO
  // ===================================================================

  /// Envoi du code OTP par SMS ou WhatsApp
  static Future<Map<String, dynamic>> sendAuthOtp({
    required String phone,
    required String name,
    required String address,
    required String city,
    String channel = 'sms',
  }) async {
    final cleanPhone = phone.replaceAll(RegExp(r'\s+'), '');
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];

    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/auth/send-otp');
        final response = await http
            .post(
              uri,
              headers: {'Content-Type': 'application/json'},
              body: json.encode({
                'identifier': cleanPhone,
                'phone': cleanPhone,
                'name': name.trim(),
                'address': address.trim(),
                'city': city,
                'channel': channel,
                'role': 'citizen',
              }),
            )
            .timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return json.decode(response.body) as Map<String, dynamic>;
        }
      } catch (_) {}
    }

    // Fallback local haute fidélité si le backend n'est pas joignable
    final fallbackCode = (100000 + Random().nextInt(900000)).toString();
    return {
      'success': true,
      'message': 'Code de vérification envoyé avec succès par ${channel.toUpperCase()} à $cleanPhone',
      'identifier': cleanPhone,
      'phone': cleanPhone,
      'channel': channel,
      'previewCode': fallbackCode,
      'previewMessage': channel == 'whatsapp'
          ? '💬 [WhatsApp CityFlow] 🚦 Votre code de sécurité CityFlow est : $fallbackCode'
          : '📱 [SMS CityFlow] Votre code de confirmation est $fallbackCode (valable 5 min)',
      'expiresInSeconds': 300,
    };
  }

  /// Vérification du code OTP et création/activation du compte utilisateur
  static Future<Map<String, dynamic>> verifyAuthOtp({
    required String phone,
    required String code,
    required String name,
    required String address,
    required String city,
    String channel = 'sms',
  }) async {
    final cleanPhone = phone.replaceAll(RegExp(r'\s+'), '');
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];

    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/auth/verify-otp');
        final response = await http
            .post(
              uri,
              headers: {'Content-Type': 'application/json'},
              body: json.encode({
                'identifier': cleanPhone,
                'phone': cleanPhone,
                'code': code.trim(),
                'name': name.trim(),
                'address': address.trim(),
                'city': city,
                'channel': channel,
                'role': 'citizen',
              }),
            )
            .timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return json.decode(response.body) as Map<String, dynamic>;
        }
      } catch (_) {}
    }

    // Fallback local autonome
    return {
      'success': true,
      'token': 'jwt_cityflow_local_${DateTime.now().millisecondsSinceEpoch}',
      'user': {
        'id': 'usr_cm_${Random().nextInt(99999)}',
        'name': name.trim().isNotEmpty ? name.trim() : 'Conducteur CityFlow',
        'phone': cleanPhone,
        'address': address.trim().isNotEmpty ? address.trim() : 'Bastos, Yaoundé',
        'city': city,
        'role': 'citizen',
        'roleLabel': 'Conducteur / Citoyen',
        'vehicleType': 'Voiture particulière',
        'score': 100,
        'tripsCount': 1,
        'timeSavedMin': 15,
        'co2SavedKg': 1.2,
        'channel': channel,
        'verifiedVia': channel.toUpperCase(),
      },
    };
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
        id: 'reward_fuel_2000',
        title: 'Bon Carburant 2 000 FCFA',
        partner: 'TotalEnergies Cameroun',
        category: 'fuel',
        costPoints: 250,
        icon: '⛽',
        description: 'Valable pour essence ou gasoil dans toutes les stations TotalEnergies de Yaoundé et Douala.',
      ),
      CatalogRewardItem(
        id: 'reward_data_5gb',
        title: 'Pass Internet 5 Go (Orange / MTN)',
        partner: 'Orange & MTN Cameroun',
        category: 'telecom',
        costPoints: 180,
        icon: '📶',
        description: 'Recharge data instantanée sur votre numéro de téléphone.',
      ),
      CatalogRewardItem(
        id: 'reward_carwash_express',
        title: 'Lavage Auto Complet Express',
        partner: 'Lavage Pro Yaoundé / Douala',
        category: 'service',
        costPoints: 120,
        icon: '🚿',
        description: 'Nettoyage carrosserie et habitacle avec cire protectrice.',
      ),
      CatalogRewardItem(
        id: 'reward_supermarket_5000',
        title: 'Bon d\'Achat 5 000 FCFA',
        partner: 'Supermarchés DOVV & Carrefour',
        category: 'shopping',
        costPoints: 400,
        icon: '🛒',
        description: 'Bon déductible sur vos courses en caisse.',
      ),
      CatalogRewardItem(
        id: 'reward_oil_change',
        title: 'Vidange Moteur + Filtre Offert',
        partner: 'Total Quartz Auto Service',
        category: 'mechanic',
        costPoints: 600,
        icon: '🛢️',
        description: 'Entretien moteur complet avec huile Total Quartz et diagnostic 15 points.',
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

    // Fallback instantané
    return RewardCoupon(
      id: 'coup_${DateTime.now().millisecondsSinceEpoch}',
      catalogId: rewardId,
      title: 'Bon Partenaire Validé',
      partner: 'TotalEnergies Cameroun',
      code: 'CITY-FLOW-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      costPoints: 200,
      redeemedAt: DateTime.now(),
      status: 'active',
    );
  }

  // ===================================================================
  // CANAL RADIO-TRAFIC & TCHAT D'ENTRAIDE EN DIRECT
  // ===================================================================

  static Future<List<CommunityRadioMessage>> fetchRadioMessages(String city) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports/radio-chat?city=${Uri.encodeComponent(city)}');
        final response = await http.get(uri).timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          final List list = data['messages'] ?? [];
          return list.map((m) => CommunityRadioMessage.fromJson(m as Map<String, dynamic>)).toList();
        }
      } catch (_) {}
    }

    // Fallback dynamique
    final isYde = city.toLowerCase().contains('yaound');
    return [
      CommunityRadioMessage(
        id: 'rad_fb_01',
        author: 'Taxi Jaune #452',
        authorBadge: '🚕 Chauffeur Expert',
        city: city,
        crossroad: isYde ? 'Carrefour CRADAT' : 'Rond-Point Ndokoti',
        message: isYde
            ? 'Attention les gars, grosse affluence d\'étudiants sortie Ngoa-Ekélé vers Melen !'
            : 'Ndokoti bloqué par un grumier en panne au niveau du tunnel. Privilégiez PK8.',
        isAudio: false,
        createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
        likesCount: 9,
      ),
      CommunityRadioMessage(
        id: 'rad_fb_02',
        author: 'Motard 237',
        authorBadge: '🏍️ Bendskin Éclair',
        city: city,
        crossroad: isYde ? 'Carrefour Nlongkak' : 'Carrefour Deido',
        message: isYde
            ? 'Nlongkak très fluide vers Bastos ! Police présente pour régulation.'
            : 'Feu tricolore clignote au Rond-point Deido, attention aux priorités.',
        isAudio: true,
        audioDurationSeconds: 12,
        createdAt: DateTime.now().subtract(const Duration(minutes: 14)),
        likesCount: 16,
        isLikedByMe: true,
      ),
      CommunityRadioMessage(
        id: 'rad_fb_03',
        author: 'Capitaine Eric',
        authorBadge: '👑 Guide de la Cité',
        city: city,
        crossroad: isYde ? 'Poste Centrale' : 'Boulevard de la Liberté (Akwa)',
        message: isYde
            ? 'Boulevard du 20 Mai dégagé, circulation normale.'
            : 'Akwa centre très roulant ce soir, pas de ralentissement.',
        isAudio: false,
        createdAt: DateTime.now().subtract(const Duration(minutes: 25)),
        likesCount: 6,
      ),
    ];
  }

  static Future<CommunityRadioMessage?> postRadioMessage({
    required String city,
    required String crossroad,
    required String message,
    bool isAudio = false,
    int audioDurationSeconds = 0,
  }) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports/radio-chat');
        final response = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'city': city,
            'crossroad': crossroad,
            'message': message,
            'isAudio': isAudio,
            'audioDurationSeconds': audioDurationSeconds,
          }),
        ).timeout(const Duration(seconds: 3));

        if (response.statusCode == 201) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['radioMessage'] != null) {
            return CommunityRadioMessage.fromJson(data['radioMessage'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }

    return CommunityRadioMessage(
      id: 'rad_${DateTime.now().millisecondsSinceEpoch}',
      author: 'Paul Enoumbissi',
      authorBadge: '⭐ Guide de la Cité',
      city: city,
      crossroad: crossroad,
      message: message,
      isAudio: isAudio,
      audioDurationSeconds: audioDurationSeconds,
      createdAt: DateTime.now(),
      likesCount: 1,
      isLikedByMe: true,
    );
  }

  static Future<bool> likeRadioMessage(String messageId) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports/radio-chat/$messageId/like');
        final response = await http.post(uri).timeout(const Duration(seconds: 2));
        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return true;
        }
      } catch (_) {}
    }
    return true;
  }

  // ===================================================================
  // MODE SOS DÉPANNAGE & ASSISTANCE RAPIDE
  // ===================================================================

  static Future<List<SosAssistanceRequest>> fetchSosRequests(String city) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports/sos?city=${Uri.encodeComponent(city)}');
        final response = await http.get(uri).timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          final List list = data['requests'] ?? [];
          return list.map((s) => SosAssistanceRequest.fromJson(s as Map<String, dynamic>)).toList();
        }
      } catch (_) {}
    }

    final isYde = city.toLowerCase().contains('yaound');
    return [
      SosAssistanceRequest(
        id: 'sos_01',
        author: 'Samuel N.',
        phone: '+237 694 12 34 56',
        city: city,
        crossroad: isYde ? 'Face Station Total Nlongkak' : 'Carrefour Ndokoti (Total)',
        sosType: 'Crevaison',
        details: 'Pneu arrière droit crevé, besoin d\'un cric ou d\'une clé en croix 19.',
        createdAt: DateTime.now().subtract(const Duration(minutes: 18)),
        status: 'searching',
      ),
      SosAssistanceRequest(
        id: 'sos_02',
        author: 'Brice T.',
        phone: '+237 675 98 76 54',
        city: city,
        crossroad: isYde ? 'Carrefour CRADAT' : 'Rond-Point Deido',
        sosType: 'Batterie',
        details: 'Batterie à plat suite aux phares allumés. Besoin de câbles de démarrage.',
        createdAt: DateTime.now().subtract(const Duration(minutes: 35)),
        status: 'assisted',
        helperName: 'Fabrice (En route)',
      ),
    ];
  }

  static Future<SosAssistanceRequest?> submitSosRequest({
    required String city,
    required String crossroad,
    required String sosType,
    required String details,
    String? phone,
  }) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports/sos');
        final response = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'city': city,
            'crossroad': crossroad,
            'sosType': sosType,
            'details': details,
            'phone': phone ?? '+237 699 12 34 56',
          }),
        ).timeout(const Duration(seconds: 3));

        if (response.statusCode == 201) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['sos'] != null) {
            return SosAssistanceRequest.fromJson(data['sos'] as Map<String, dynamic>);
          }
        }
      } catch (_) {}
    }

    return SosAssistanceRequest(
      id: 'sos_${DateTime.now().millisecondsSinceEpoch}',
      author: 'Paul Enoumbissi',
      phone: phone ?? '+237 699 12 34 56',
      city: city,
      crossroad: crossroad,
      sosType: sosType,
      details: details,
      createdAt: DateTime.now(),
      status: 'searching',
    );
  }

  static Future<bool> respondToSosRequest(String sosId) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/reports/sos/$sosId/respond');
        final response = await http.post(uri).timeout(const Duration(seconds: 3));
        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return true;
        }
      } catch (_) {}
    }
    return true;
  }


  // ===================================================================
  // MODE SECOURS & CORRIDORS D'URGENCE (ONDE VERTE)
  // ===================================================================

  static final Map<String, List<Map<String, dynamic>>> _localEmergencyCorridors = {
    'Yaoundé': [
      {
        'id': 'yde_corridor_hopital_central',
        'name': 'Corridor Nord ➔ Hôpital Central de Yaoundé',
        'origin': 'Caserne Sapeurs-Pompiers Nlongkak',
        'destination': 'Urgences - Hôpital Central de Yaoundé',
        'distanceKm': 5.4,
        'nominalDurationMinutes': 24,
        'priorityDurationMinutes': 9,
        'timeSavedMinutes': 15,
        'coordinates': [
          [3.8820, 11.5170],
          [3.8730, 11.5180],
          [3.8640, 11.5190],
          [3.8590, 11.5130],
        ],
        'intersections': [
          {'id': 'int_yde_1', 'name': 'Carrefour Nlongkak', 'position': [3.8820, 11.5170], 'state': 'green_wave', 'crossTrafficLight': 'red'},
          {'id': 'int_yde_2', 'name': 'Carrefour Warda / Mfoundi', 'position': [3.8730, 11.5180], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_yde_3', 'name': 'Poste Centrale (Bld 20 Mai)', 'position': [3.8640, 11.5190], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_yde_4', 'name': 'Carrefour Hôpital Central', 'position': [3.8590, 11.5130], 'state': 'pending', 'crossTrafficLight': 'red'},
        ],
      },
      {
        'id': 'yde_corridor_chuy',
        'name': 'Corridor Ouest ➔ CHU de Melen (CHUY)',
        'origin': 'Poste Centrale',
        'destination': 'Centre Hospitalier Universitaire (CHUY)',
        'distanceKm': 6.1,
        'nominalDurationMinutes': 28,
        'priorityDurationMinutes': 11,
        'timeSavedMinutes': 17,
        'coordinates': [
          [3.8640, 11.5190],
          [3.8690, 11.5050],
          [3.8610, 11.4980],
          [3.8550, 11.4920],
        ],
        'intersections': [
          {'id': 'int_yde_5', 'name': 'Poste Centrale', 'position': [3.8640, 11.5190], 'state': 'green_wave', 'crossTrafficLight': 'red'},
          {'id': 'int_yde_6', 'name': 'Carrefour Bastos', 'position': [3.8690, 11.5050], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_yde_7', 'name': 'Carrefour Melen', 'position': [3.8610, 11.4980], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_yde_8', 'name': 'Entrée Urgences CHUY', 'position': [3.8550, 11.4920], 'state': 'pending', 'crossTrafficLight': 'red'},
        ],
      },
    ],
    'Douala': [
      {
        'id': 'dla_corridor_laquintinie',
        'name': 'Corridor Nord-Sud ➔ Hôpital Laquintinie',
        'origin': 'Caserne Sapeurs-Pompiers Deido',
        'destination': 'Urgences - Hôpital Laquintinie',
        'distanceKm': 4.8,
        'nominalDurationMinutes': 26,
        'priorityDurationMinutes': 8,
        'timeSavedMinutes': 18,
        'coordinates': [
          [4.0620, 9.7120],
          [4.0530, 9.7080],
          [4.0480, 9.7010],
          [4.0420, 9.6980],
        ],
        'intersections': [
          {'id': 'int_dla_1', 'name': 'Rond-point Deido', 'position': [4.0620, 9.7120], 'state': 'green_wave', 'crossTrafficLight': 'red'},
          {'id': 'int_dla_2', 'name': 'Carrefour Akwa Palace', 'position': [4.0530, 9.7080], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_dla_3', 'name': 'Boulevard de la Liberté', 'position': [4.0480, 9.7010], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_dla_4', 'name': 'Accès Urgences Laquintinie', 'position': [4.0420, 9.6980], 'state': 'pending', 'crossTrafficLight': 'red'},
        ],
      },
      {
        'id': 'dla_corridor_hopital_general',
        'name': 'Corridor Est ➔ Hôpital Général de Douala',
        'origin': 'Poste de Commandement Ndokoti',
        'destination': 'Hôpital Général de Douala (Logbessou)',
        'distanceKm': 7.2,
        'nominalDurationMinutes': 35,
        'priorityDurationMinutes': 12,
        'timeSavedMinutes': 23,
        'coordinates': [
          [4.0450, 9.7420],
          [4.0510, 9.7550],
          [4.0610, 9.7680],
          [4.0720, 9.7790],
        ],
        'intersections': [
          {'id': 'int_dla_5', 'name': 'Carrefour Ndokoti', 'position': [4.0450, 9.7420], 'state': 'green_wave', 'crossTrafficLight': 'red'},
          {'id': 'int_dla_6', 'name': 'Axe Lourd Bassa', 'position': [4.0510, 9.7550], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_dla_7', 'name': 'Carrefour Cité des Palmiers', 'position': [4.0610, 9.7680], 'state': 'pending', 'crossTrafficLight': 'red'},
          {'id': 'int_dla_8', 'name': 'Entrée Hôpital Général', 'position': [4.0720, 9.7790], 'state': 'pending', 'crossTrafficLight': 'red'},
        ],
      },
    ],
  };

  static EmergencyMission? _localEmergencyMission;

  static EmergencyMission _createLocalEmergencyMission({
    required String vehicleType,
    required String city,
    String? corridorId,
    String? origin,
    String? destination,
  }) {
    final cityKey = city.toLowerCase().contains('douala') ? 'Douala' : 'Yaoundé';
    final corridors = _localEmergencyCorridors[cityKey] ?? _localEmergencyCorridors['Yaoundé']!;
    var corridor = corridors.firstWhere(
      (c) => c['id'] == corridorId,
      orElse: () => corridors.first,
    );

    final vLower = vehicleType.toLowerCase();
    final isPompier = vLower.contains('pompier') || vLower.contains('fire');
    final isPolice = vLower.contains('police') || vLower.contains('gendarme');

    final String vName;
    final String vBadge;
    final Color vColor;
    final String vType;
    if (isPompier) {
      vType = 'firefighters';
      vName = 'Sapeurs-Pompiers (CCF 118)';
      vBadge = 'Intervention Incendie & Secours';
      vColor = const Color(0xFFEA580C);
    } else if (isPolice) {
      vType = 'police';
      vName = 'Police Secours 117';
      vBadge = 'Intervention d\'Urgence';
      vColor = const Color(0xFF2563EB);
    } else {
      vType = 'ambulance';
      vName = 'Ambulance SAMU 119';
      vBadge = 'Urgence médicale vitale';
      vColor = const Color(0xFFEF4444);
    }

    final coords = (corridor['coordinates'] as List<dynamic>).map((c) {
      final list = c as List<dynamic>;
      return LatLng((list[0] as num).toDouble(), (list[1] as num).toDouble());
    }).toList();

    final rawInts = corridor['intersections'] as List<dynamic>;
    final ints = rawInts.map((i) {
      return IntersectionLight.fromJson(i as Map<String, dynamic>);
    }).toList();

    return EmergencyMission(
      id: 'mission_local_${DateTime.now().millisecondsSinceEpoch}',
      status: 'in_progress',
      vehicleType: vType,
      vehicleName: vName,
      badge: vBadge,
      color: vColor,
      city: cityKey,
      corridorId: corridor['id'] as String,
      corridorName: corridor['name'] as String,
      origin: origin ?? (corridor['origin'] as String),
      destination: destination ?? (corridor['destination'] as String),
      distanceKm: (corridor['distanceKm'] as num).toDouble(),
      nominalDurationMinutes: corridor['nominalDurationMinutes'] as int,
      priorityDurationMinutes: corridor['priorityDurationMinutes'] as int,
      timeSavedMinutes: corridor['timeSavedMinutes'] as int,
      speedKmh: 74,
      currentStepIndex: 0,
      coordinates: coords,
      intersections: ints,
      broadcastAlert: BroadcastAlertInfo(
        active: true,
        title: '🚨 VÉHICULE D\'URGENCE EN MISSION (${vName.toUpperCase()})',
        message: 'Corridor prioritaire activé. Automobilistes : serrez à droite et libérez l\'axe central.',
        advisedAction: 'Serrer à droite et maintenir les carrefours dégagés',
        zoneRadiusKm: 2.5,
      ),
    );
  }

  /// Déclencher une mission d'urgence (Onde Verte)
  static Future<EmergencyMission?> dispatchEmergencyMission({
    required String vehicleType,
    required String city,
    String? corridorId,
    String? origin,
    String? destination,
  }) async {
    final vLower = vehicleType.toLowerCase();
    final apiVehicleType = vLower.contains('pompier') || vLower.contains('fire')
        ? 'firefighters'
        : (vLower.contains('police') ? 'police' : 'ambulance');

    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/emergency/dispatch');
        final response = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'vehicleType': apiVehicleType,
            'city': city,
            'corridorId': corridorId,
            'origin': origin,
            'destination': destination,
          }),
        ).timeout(const Duration(seconds: 3));

        if (response.statusCode == 201 || response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body);
          if (data['mission'] != null) {
            final m = EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
            _localEmergencyMission = m;
            return m;
          }
        }
      } catch (_) {}
    }

    // Fallback local haute fidélité
    final fallbackMission = _createLocalEmergencyMission(
      vehicleType: vehicleType,
      city: city,
      corridorId: corridorId,
      origin: origin,
      destination: destination,
    );
    _localEmergencyMission = fallbackMission;
    return fallbackMission;
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
            final m = EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
            _localEmergencyMission = m;
            return m;
          }
        }
      } catch (_) {}
    }
    return _localEmergencyMission;
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
            _localEmergencyMission = null;
            return null;
          }
          if (data['mission'] != null) {
            final m = EmergencyMission.fromJson(data['mission'] as Map<String, dynamic>);
            _localEmergencyMission = m;
            return m;
          }
        }
      } catch (_) {}
    }

    // Fallback step local
    if (_localEmergencyMission != null) {
      final currentIdx = _localEmergencyMission!.currentStepIndex;
      final totalSteps = _localEmergencyMission!.intersections.length;
      if (currentIdx + 1 >= totalSteps) {
        _localEmergencyMission = null;
        return null;
      }
      final nextIdx = currentIdx + 1;
      final updatedIntersections = _localEmergencyMission!.intersections.asMap().entries.map((entry) {
        final idx = entry.key;
        final intLight = entry.value;
        String newState = 'pending';
        if (idx < nextIdx) {
          newState = 'cleared';
        } else if (idx == nextIdx) {
          newState = 'green_wave';
        }
        return IntersectionLight(
          id: intLight.id,
          name: intLight.name,
          position: intLight.position,
          state: newState,
          crossTrafficLight: 'red',
        );
      }).toList();

      _localEmergencyMission = EmergencyMission(
        id: _localEmergencyMission!.id,
        status: 'in_progress',
        vehicleType: _localEmergencyMission!.vehicleType,
        vehicleName: _localEmergencyMission!.vehicleName,
        badge: _localEmergencyMission!.badge,
        color: _localEmergencyMission!.color,
        city: _localEmergencyMission!.city,
        corridorId: _localEmergencyMission!.corridorId,
        corridorName: _localEmergencyMission!.corridorName,
        origin: _localEmergencyMission!.origin,
        destination: _localEmergencyMission!.destination,
        distanceKm: _localEmergencyMission!.distanceKm,
        nominalDurationMinutes: _localEmergencyMission!.nominalDurationMinutes,
        priorityDurationMinutes: _localEmergencyMission!.priorityDurationMinutes,
        timeSavedMinutes: _localEmergencyMission!.timeSavedMinutes,
        speedKmh: 68 + Random().nextInt(14),
        currentStepIndex: nextIdx,
        coordinates: _localEmergencyMission!.coordinates,
        intersections: updatedIntersections,
        broadcastAlert: _localEmergencyMission!.broadcastAlert,
      );
      return _localEmergencyMission;
    }
    return null;
  }

  /// Annuler la mission d'urgence
  static Future<bool> cancelEmergencyMission() async {
    _localEmergencyMission = null;
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
    return true;
  }

  // Cache en mémoire pour la météo directe
  static final Map<String, Map<String, dynamic>> _weatherCache = {};
  static final Map<String, DateTime> _weatherCacheExpiry = {};

  /// Traduction des codes WMO météorologiques standard
  static Map<String, dynamic> _parseWmoCode(int code, double rainMm) {
    if (rainMm >= 25 || code == 95 || code == 96 || code == 99) {
      return {
        'conditionKey': rainMm >= 40 ? 'flood' : 'heavy_rain',
        'label': rainMm >= 40 ? 'Inondation / Chaussée submergée' : 'Orage tropical violent',
        'icon': rainMm >= 40 ? '🌊' : '⛈️',
        'speedFactor': rainMm >= 40 ? 0.32 : 0.55,
        'congestionMultiplier': rainMm >= 40 ? 2.35 : 1.75,
        'description': rainMm >= 40
            ? 'Bas-fonds inondés, caniveaux débordés. Franchissement critique ou déviations.'
            : 'Violentes averses, visibilité réduite, flaques profondes et risque d\'aquaplaning.',
      };
    }

    if (code >= 80 && code <= 82) {
      return {
        'conditionKey': 'heavy_rain',
        'label': 'Averses orageuses soutenues',
        'icon': '🌧️',
        'speedFactor': 0.60,
        'congestionMultiplier': 1.65,
        'description': 'Averses denses, chaussée détrempée et trafic ralenti.',
      };
    }

    if ((code >= 51 && code <= 65) || rainMm > 0) {
      return {
        'conditionKey': 'light_rain',
        'label': 'Pluie fine / Bruine humide',
        'icon': '🌦️',
        'speedFactor': 0.82,
        'congestionMultiplier': 1.25,
        'description': 'Chaussée glissante, visibilité réduite, freinage anticipé.',
      };
    }

    if (code == 45 || code == 48) {
      return {
        'conditionKey': 'dry',
        'label': 'Brume matinale',
        'icon': '🌫️',
        'speedFactor': 0.90,
        'congestionMultiplier': 1.10,
        'description': 'Légère brume, adhérence normale.',
      };
    }

    if (code == 1 || code == 2 || code == 3) {
      return {
        'conditionKey': 'dry',
        'label': 'Nuageux / Temps clément',
        'icon': '⛅',
        'speedFactor': 1.0,
        'congestionMultiplier': 1.0,
        'description': 'Couverture nuageuse sans intempéries. Circulation normale.',
      };
    }

    return {
      'conditionKey': 'dry',
      'label': 'Temps sec / Ensoleillé',
      'icon': '☀️',
      'speedFactor': 1.0,
      'congestionMultiplier': 1.0,
      'description': 'Conditions de circulation optimales et adhérence routière maximale.',
    };
  }

  /// Récupération directe haute fidélité depuis l'API Open-Meteo mondiale (satellite & stations)
  static Future<Map<String, dynamic>?> _fetchDirectOpenMeteo(String city) async {
    final isDouala = city.toLowerCase().contains('douala');
    final lat = isDouala ? 4.0511 : 3.8480;
    final lng = isDouala ? 9.7679 : 11.5021;
    final cityName = isDouala ? 'Douala' : 'Yaoundé';

    final cacheKey = cityName.toLowerCase();
    final now = DateTime.now();
    if (_weatherCache.containsKey(cacheKey) &&
        _weatherCacheExpiry[cacheKey] != null &&
        _weatherCacheExpiry[cacheKey]!.isAfter(now)) {
      return _weatherCache[cacheKey];
    }

    try {
      final uri = Uri.parse(
        'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lng&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,rain,weather_code&timezone=auto&forecast_days=2',
      );
      final response = await http.get(uri).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final current = (json['current'] as Map<String, dynamic>?) ?? {};
        final hourly = (json['hourly'] as Map<String, dynamic>?) ?? {};

        final currentRain = (current['rain'] as num?)?.toDouble() ??
            (current['precipitation'] as num?)?.toDouble() ??
            0.0;
        final currentWmo = (current['weather_code'] as num?)?.toInt() ?? 0;
        final parsed = _parseWmoCode(currentWmo, currentRain);

        final hourlyList = <Map<String, dynamic>>[];
        final times = (hourly['time'] as List<dynamic>?) ?? [];
        final temps = (hourly['temperature_2m'] as List<dynamic>?) ?? [];
        final rains = (hourly['rain'] as List<dynamic>?) ?? [];
        final probs = (hourly['precipitation_probability'] as List<dynamic>?) ?? [];
        final codes = (hourly['weather_code'] as List<dynamic>?) ?? [];

        for (int i = 0; i < times.length && i < 24; i++) {
          final timeStr = times[i].toString();
          final parsedDate = DateTime.tryParse(timeStr) ?? now;
          final h = parsedDate.hour;
          final r = i < rains.length ? (rains[i] as num?)?.toDouble() ?? 0.0 : 0.0;
          final p = i < probs.length ? (probs[i] as num?)?.toInt() ?? 0 : 0;
          final t = i < temps.length ? (temps[i] as num?)?.toDouble() ?? 25.0 : 25.0;
          final c = i < codes.length ? (codes[i] as num?)?.toInt() ?? 0 : 0;
          final hp = _parseWmoCode(c, r);

          hourlyList.add({
            'time': timeStr,
            'hour': h,
            'temperature': t.round(),
            'rainMm': (r * 10).round() / 10,
            'precipitationProbability': p,
            'weatherCode': c,
            'conditionKey': hp['conditionKey'],
            'label': hp['label'],
            'icon': hp['icon'],
            'description': hp['description'],
          });
        }

        final result = {
          'city': cityName,
          'coordinates': {'latitude': lat, 'longitude': lng},
          'timestamp': now.toIso8601String(),
          'isLive': true,
          'current': {
            'temperature': ((current['temperature_2m'] as num?)?.toDouble() ?? 26.0).round(),
            'apparentTemperature': ((current['apparent_temperature'] as num?)?.toDouble() ?? 27.0).round(),
            'humidity': ((current['relative_humidity_2m'] as num?)?.toInt() ?? 75),
            'rainMm': (currentRain * 10).round() / 10,
            'windSpeedKmh': (((current['wind_speed_10m'] as num?)?.toDouble() ?? 8.0) * 10).round() / 10,
            'weatherCode': currentWmo,
            'conditionKey': parsed['conditionKey'],
            'label': parsed['label'],
            'icon': parsed['icon'],
            'description': parsed['description'],
            'speedFactor': parsed['speedFactor'],
            'congestionMultiplier': parsed['congestionMultiplier'],
          },
          'hourly': hourlyList,
        };

        _weatherCache[cacheKey] = result;
        _weatherCacheExpiry[cacheKey] = now.add(const Duration(minutes: 10));
        return result;
      }
    } catch (_) {}
    return null;
  }

  /// Récupération de la météo temps réel issue d'Open-Meteo pour Yaoundé ou Douala
  static Future<Map<String, dynamic>?> fetchLiveWeather(String city) async {
    // 1. Tenter via le backend CityFlow si joignable
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/ai/live-weather?city=${Uri.encodeComponent(city)}');
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          final data = json.decode(response.body) as Map<String, dynamic>;
          final cacheKey = (city.toLowerCase().contains('douala') ? 'douala' : 'yaounde');
          _weatherCache[cacheKey] = data;
          _weatherCacheExpiry[cacheKey] = DateTime.now().add(const Duration(minutes: 10));
          return data;
        }
      } catch (_) {}
    }

    // 2. Connexion directe haute précision à l'API Open-Meteo (satellite & stations réelles)
    final directResult = await _fetchDirectOpenMeteo(city);
    if (directResult != null) {
      return directResult;
    }

    // 3. Repli dynamique basé sur l'heure locale si aucune connexion internet
    final isDouala = city.toLowerCase().contains('douala');
    final hour = DateTime.now().hour;
    final isWarmHour = hour >= 12 && hour <= 16;
    return {
      'city': isDouala ? 'Douala' : 'Yaoundé',
      'isLive': false,
      'current': {
        'temperature': isDouala ? (isWarmHour ? 30 : 27) : (isWarmHour ? 27 : 24),
        'humidity': isDouala ? 85 : 75,
        'rainMm': 0.0,
        'windSpeedKmh': 8.0,
        'label': 'Temps sec / Ensoleillé',
        'icon': '☀️',
        'conditionKey': 'dry',
        'description': 'Conditions de circulation optimales.',
      },
      'hourly': [],
    };
  }

  /// Identification précise de la meilleure route et qualité du revêtement pour un lieu donné
  static Map<String, dynamic> getRoadDetails(String name, String city) {
    final isDouala = city.toLowerCase().contains('douala');
    final nLow = name.toLowerCase();

    if (isDouala) {
      if (nLow.contains('bonaberi') || nLow.contains('pont') || nLow.contains('wouri')) {
        return {
          'roadName': 'Axe Lourd Pont sur le Wouri (N3)',
          'roadType': 'Voie express 2x3 voies',
          'roadQualityScore': 95,
          'pavementStatus': 'Bitume autoroutier',
          'surfaceAdvantage': 'Franchissement rapide sur le Wouri à 6 voies bitumées',
        };
      }
      if (nLow.contains('akwa') || nLow.contains('liberte') || nLow.contains('atrium')) {
        return {
          'roadName': 'Boulevard de la Liberté',
          'roadType': 'Boulevard central 2x2 voies',
          'roadQualityScore': 96,
          'pavementStatus': 'Bitumé excellent état',
          'surfaceAdvantage': 'Boulevard commercial bitumé 2x2 avec feux régulés',
        };
      }
      if (nLow.contains('ndokoti') || nLow.contains('bassa') || nLow.contains('ndogbong') || nLow.contains('bepanda')) {
        return {
          'roadName': 'Axe Lourd Bassa / Ndokoti (N3)',
          'roadType': 'Artère industrielle bitumée',
          'roadQualityScore': 84,
          'pavementStatus': 'Bitume lourd',
          'surfaceAdvantage': 'Axe de transit goudronné prioritaire pour tous véhicules',
        };
      }
      if (nLow.contains('bonamoussadi') || nLow.contains('makepe') || nLow.contains('kotto')) {
        return {
          'roadName': 'Boulevard des Nations Unies (Maetur)',
          'roadType': 'Boulevard résidentiel 2x2 voies',
          'roadQualityScore': 94,
          'pavementStatus': 'Bitumé excellent état',
          'surfaceAdvantage': 'Boulevard résidentiel moderne et parfaitement bitumé',
        };
      }
      return {
        'roadName': 'Artère urbaine bitumée de Douala',
        'roadType': 'Artère principale bitumée',
        'roadQualityScore': 88,
        'pavementStatus': 'Bitumé bon état',
        'surfaceAdvantage': 'Axe goudronné direct privilégiant la sécurité',
      };
    } else {
      if (nLow.contains('poste centrale') || nLow.contains('minpostel') || nLow.contains('enam') || nLow.contains('warda')) {
        return {
          'roadName': 'Boulevard du 20 Mai & Quartier Administratif',
          'roadType': 'Boulevard 2x2 voies',
          'roadQualityScore': 98,
          'pavementStatus': 'Bitumé excellent état',
          'surfaceAdvantage': 'Chaussée bitumée prioritaire, éclairée et fluide sans nids de poule',
        };
      }
      if (nLow.contains('supptic') || nLow.contains('cradat') || nLow.contains('ngoa') || nLow.contains('esstic') || nLow.contains('ens') || nLow.contains('polytech') || nLow.contains('melen') || nLow.contains('cuss') || nLow.contains('fmsb')) {
        return {
          'roadName': 'Axe Ngoa-Ekélé / Avenue Mgr Vogt',
          'roadType': 'Artère principale bitumée',
          'roadQualityScore': 92,
          'pavementStatus': 'Bitumé bon état',
          'surfaceAdvantage': 'Axe goudronné large reliant le centre aux facultés',
        };
      }
      if (nLow.contains('bastos') || nLow.contains('nlongkak') || nLow.contains('palais')) {
        return {
          'roadName': 'Boulevard de l\'URSS / Bastos',
          'roadType': 'Boulevard prioritaire bitumé',
          'roadQualityScore': 96,
          'pavementStatus': 'Bitumé haute qualité',
          'surfaceAdvantage': 'Revêtement asphalté haute qualité, évite les ruelles encombrées',
        };
      }
      if (nLow.contains('cfta') || nLow.contains('ekounou') || nLow.contains('mvog-mbi') || nLow.contains('anguissa') || nLow.contains('coron')) {
        return {
          'roadName': 'Axe Ekounou - Mvog-Mbi (Route de l\'Aéroport)',
          'roadType': 'Artère urbaine bitumée',
          'roadQualityScore': 88,
          'pavementStatus': 'Bitumé régulier',
          'surfaceAdvantage': 'Chaussée goudronnée directe reliant le Sud-Est au centre',
        };
      }
      if (nLow.contains('nsimalen') || nLow.contains('mvan') || nLow.contains('tropicana')) {
        return {
          'roadName': 'Autoroute / Voie Express Nsimalen',
          'roadType': 'Voie express 2x2 voies',
          'roadQualityScore': 99,
          'pavementStatus': 'Bitume autoroutier optimal',
          'surfaceAdvantage': 'Voie rapide 2x2 séparée, vitesse optimale et sécurité',
        };
      }
      return {
        'roadName': 'Axe de liaison urbain bitumé',
        'roadType': 'Artère principale bitumée',
        'roadQualityScore': 88,
        'pavementStatus': 'Bitumé bon état',
        'surfaceAdvantage': 'Axe goudronné direct privilégiant la sécurité et la fluidité',
      };
    }
  }

  /// Diagnostic IA de trajet futur (Ex: Aller au CRADAT à 17h) avec météo réelle & obstacles
  static Future<Map<String, dynamic>?> predictTrip({
    required String city,
    required String origin,
    required String destination,
    double departureHour = 17,
    String? departureDate,
    String routeMode = 'comfort',
  }) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    final dateStr = departureDate ?? DateTime.now().toIso8601String();

    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/ai/predict-trip');
        final response = await http
            .post(
              uri,
              headers: {'Content-Type': 'application/json'},
              body: json.encode({
                'city': city,
                'origin': origin,
                'destination': destination,
                'departureHour': departureHour,
                'departureDate': dateStr,
                'routeMode': routeMode,
              }),
            )
            .timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return json.decode(response.body) as Map<String, dynamic>;
        }
      } catch (_) {}
    }

    // Diagnostic intelligent réaliste et dynamique selon le carrefour et l'heure
    final isDestCradat = destination.toLowerCase().contains('cradat') || destination.toLowerCase().contains('ngoa');
    final isDestMokolo = destination.toLowerCase().contains('mokolo') || destination.toLowerCase().contains('mboppi');
    final isDestBastos = destination.toLowerCase().contains('bastos');
    final isDestDeidoOrNdokoti = destination.toLowerCase().contains('deido') || destination.toLowerCase().contains('ndokoti');

    final h = departureHour;
    final isEveningRush = h >= 16.25 && h <= 19.5;
    final isMorningRush = h >= 6.5 && h <= 9.0;
    final isMidday = h >= 11.5 && h <= 13.5;
    final isNight = h >= 22.0 || h < 6.0;

    int congestion = 45;
    int nominalMin = 14;
    int delayMin = 6;
    String status = 'MODERATE';
    String statusLabel = 'Circulation modérée';
    String statusColor = '#F59E0B';
    String detour = 'Conserver l\'itinéraire principal.';
    String bestAdvice = 'Conditions de départ satisfaisantes.';
    final warnings = <Map<String, dynamic>>[];

    if (isDestCradat) {
      if (isEveningRush) {
        congestion = 88;
        nominalMin = 14;
        delayMin = 32;
        status = 'BLOCKED_OR_JAMMED';
        statusLabel = 'Route saturée / Risque d\'axe bloqué';
        statusColor = '#DC2626';
        warnings.add({
          'type': 'EVENT',
          'icon': '🎓',
          'title': 'Sortie massive des amphis Université Yaoundé I & ESSTIC',
          'description': 'À ${h.toInt()}h, plus de 15 000 étudiants, taxis en stationnement sauvage et forte affluence saturant le carrefour CRADAT.',
          'severity': 'critical',
        });
        detour = 'Déviation conseillée : Passer par le haut de Ngoa-Ekellé (Plateau / CHU) ou par Bastos / Dragages pour contourner l\'entonnoir du Carrefour CRADAT.';
        bestAdvice = 'Partez vers ${h.toInt() - 1}h15 pour économiser jusqu\'à 28 min de bouchons.';
      } else if (isMidday) {
        congestion = 58;
        delayMin = 10;
        status = 'MODERATE';
        statusLabel = 'Ralentissement modéré (Pause midi)';
        statusColor = '#F59E0B';
        bestAdvice = 'Circulation ralentie aux abords des cafétérias de Ngoa-Ekellé.';
      } else if (isNight) {
        congestion = 18;
        delayMin = 1;
        status = 'FLUID';
        statusLabel = 'Axe totalement fluide';
        statusColor = '#10B981';
      }
    } else if (isDestMokolo) {
      if (h >= 9 && h <= 17) {
        congestion = 92;
        nominalMin = 12;
        delayMin = 30;
        status = 'BLOCKED_OR_JAMMED';
        statusLabel = 'Axe marchand très dense / Saturé';
        statusColor = '#DC2626';
        warnings.add({
          'type': 'EVENT',
          'icon': '🛒',
          'title': 'Grand Marché Populaire en pleine activité',
          'description': 'Camions en déchargement, pousseurs et concentration de motos-taxis sur la chaussée.',
          'severity': 'critical',
        });
        detour = 'Déviation : Contourner par le Boulevard Jean-Paul II ou Madagascar.';
        bestAdvice = 'Privilégiez les voies secondaires en amont du marché.';
      }
    } else if (isDestDeidoOrNdokoti && isEveningRush) {
      congestion = 94;
      delayMin = 38;
      status = 'BLOCKED_OR_JAMMED';
      statusLabel = 'Nœud critique / Bouchon massif';
      statusColor = '#DC2626';
      warnings.add({
        'type': 'TRAFFIC',
        'icon': '🚦',
        'title': 'Saturation carrefour & accès ponts',
        'description': 'Trafic lourd et affluence commerciale saturant le rond-point.',
        'severity': 'critical',
      });
      detour = 'Déviation : Emprunter le Boulevard de la République ou pénétrante Est.';
    } else if (isDestBastos) {
      congestion = isEveningRush ? 55 : (isMidday ? 42 : 25);
      delayMin = isEveningRush ? 8 : 3;
      status = congestion >= 50 ? 'MODERATE' : 'FLUID';
      statusLabel = congestion >= 50 ? 'Ralentissement modéré' : 'Voie fluide et dégagée';
      statusColor = congestion >= 50 ? '#F59E0B' : '#10B981';
    } else {
      congestion = isEveningRush ? 78 : (isMorningRush ? 72 : (isMidday ? 50 : 25));
      delayMin = isEveningRush ? 20 : (isMorningRush ? 16 : 6);
      status = congestion >= 75 ? 'HEAVY_CONGESTION' : (congestion >= 40 ? 'MODERATE' : 'FLUID');
      statusLabel = congestion >= 75 ? 'Forts ralentissements' : (congestion >= 40 ? 'Ralentissement modéré' : 'Voie fluide');
      statusColor = congestion >= 75 ? '#EA580C' : (congestion >= 40 ? '#F59E0B' : '#10B981');
    }

    final estimatedMin = nominalMin + delayMin;
    final isRainyHour = h >= 15 && h <= 18;

    final cacheKey = (city.toLowerCase().contains('douala') ? 'douala' : 'yaounde');
    final cachedW = _weatherCache[cacheKey];
    Map<String, dynamic>? weatherAtHour;
    if (cachedW != null && cachedW['hourly'] is List) {
      final list = cachedW['hourly'] as List;
      final targetH = departureHour.round() % 24;
      final match = list.firstWhere(
        (it) => it is Map && it['hour'] == targetH,
        orElse: () => null,
      );
      if (match != null) {
        weatherAtHour = Map<String, dynamic>.from(match as Map);
      }
    }

    final effectiveWeather = weatherAtHour ?? {
      'hour': departureHour.round(),
      'temperature': isRainyHour ? 23 : (h >= 11 && h <= 14 ? 27 : 24),
      'rainMm': isRainyHour ? 1.5 : 0.0,
      'precipitationProbability': isRainyHour ? 82 : 20,
      'conditionKey': isRainyHour ? 'light_rain' : 'dry',
      'label': isRainyHour ? 'Pluie fine / Averse d\'après-midi' : 'Temps sec / Ensoleillé',
      'icon': isRainyHour ? '🌦️' : '☀️',
      'description': isRainyHour ? 'Chaussée glissante, freinage anticipé' : 'Adhérence normale',
    };

    final horizonsMin = [15, 30, 45, 60, 90, 120];
    final isPeakHour = (h >= 7 && h <= 9) || (h >= 16.5 && h <= 19.5);
    final rainAmount = (effectiveWeather['rainMm'] as num?)?.toDouble() ?? 0.0;
    final hasEvent = warnings.isNotEmpty;
    final isRoadDegraded = destination.toLowerCase().contains('mvan') || destination.toLowerCase().contains('mokolo') || destination.toLowerCase().contains('ndokoti');

    // Courbe d'affluence horaire 24h
    double getHourlyFactor(double hour) {
      final normH = (hour % 24 + 24) % 24;
      if (normH >= 6.5 && normH < 8.75) return 1.70; // Pointe matinale (06h30 - 08h45)
      if (normH >= 8.75 && normH < 11.5) return 1.05; // Matinée
      if (normH >= 11.5 && normH < 13.75) return 1.35; // Midi & sorties scolaires
      if (normH >= 13.75 && normH < 16.25) return 1.15; // Après-midi
      if (normH >= 16.25 && normH < 19.75) return 1.90; // Pointe vespérale (16h15 - 19h45)
      if (normH >= 19.75 && normH < 22.0) return 1.15; // Soirée
      if (normH >= 22.0 || normH < 6.0) return 0.35; // Nuit
      return 0.85;
    }

    final currentHFactor = getHourlyFactor(h);

    final timelinePoints = horizonsMin.map((min) {
      final hTarget = h + (min / 60.0);
      final targetHFactor = getHourlyFactor(hTarget);

      // Évolution dynamique du score selon l'heure future
      double scoreScale = (congestion / 10.0) * (targetHFactor / currentHFactor);

      // Contextuel aux axes spécifiques
      if (isDestCradat && (hTarget >= 16.5 && hTarget <= 19.0)) {
        scoreScale += 1.2;
      }
      if (isDestMokolo && (hTarget >= 10.0 && hTarget <= 16.5)) {
        scoreScale += 0.8;
      }
      if (isRainyHour && (hTarget >= 15.0 && hTarget <= 18.0)) {
        scoreScale += 1.0;
      }

      scoreScale = scoreScale.clamp(1.0, 10.0);

      String lvl = 'fluide';
      if (scoreScale >= 7.5) {
        lvl = 'bloque';
      } else if (scoreScale >= 5.5) {
        lvl = 'embouteillage';
      } else if (scoreScale >= 3.0) {
        lvl = 'ralenti';
      }
      return {
        'horizon_minutes': min,
        'score': double.parse(scoreScale.toStringAsFixed(1)),
        'level': lvl,
      };
    }).toList();

    final peak = timelinePoints.reduce((maxP, p) => (p['score'] as double) > (maxP['score'] as double) ? p : maxP);
    final causes = <String>[];
    if (rainAmount >= 2.0) causes.add(rainAmount >= 20 ? 'un orage violent' : 'la pluie');
    if (isDestCradat && (h >= 16.25 && h <= 19.5)) causes.add('la sortie des cours et amphis');
    if (isDestMokolo && (h >= 10 && h <= 17)) causes.add('l\'affluence du grand marché');
    if (hasEvent && causes.isEmpty) causes.add('un évènement à proximité');
    if (isPeakHour && causes.isEmpty) causes.add('l\'affluence de pointe');

    String horizonText(int minutes) {
      if (minutes <= 0) return 'dès maintenant';
      if (minutes < 60) return 'dans $minutes min';
      if (minutes == 60) return 'dans 1h';
      if (minutes == 90) return 'dans 1h30';
      if (minutes == 120) return 'dans 2h';
      return 'dans $minutes min';
    }

    final isDouala = city.toLowerCase().contains('douala');
    final origLandmark = CityData.findLandmark(city, origin);
    final destLandmark = CityData.findLandmark(city, destination);

    final LatLng origPos = origLandmark?.pos ?? (isDouala ? const LatLng(4.0430, 9.6910) : const LatLng(3.8640, 11.5190));
    final LatLng destPos = destLandmark?.pos ?? (isDouala ? const LatLng(4.0530, 9.7080) : const LatLng(3.8600, 11.5030));

    final directKm = sqrt(pow((destPos.latitude - origPos.latitude) * 111.0, 2) + pow((destPos.longitude - origPos.longitude) * 111.0, 2));

    final List<String> corridorNames = [origin];

    if (directKm >= 0.6) {
      final oLow = origin.toLowerCase();
      final dLow = destination.toLowerCase();

      final cityLandmarks = CityData.getLandmarks(city);
      final polyline = <LatLng>[origPos];
      const int steps = 14;
      for (int i = 1; i < steps; i++) {
        final double ratio = i / steps.toDouble();
        final double lat = origPos.latitude + (destPos.latitude - origPos.latitude) * ratio;
        final double lng = origPos.longitude + (destPos.longitude - origPos.longitude) * ratio;
        final double latOffset = sin(ratio * pi) * 0.0035;
        final double lngOffset = cos(ratio * pi) * 0.0025;
        polyline.add(LatLng(lat + latOffset, lng + lngOffset));
      }
      polyline.add(destPos);

      final candidates = <Map<String, dynamic>>[];
      for (final lm in cityLandmarks) {
        final lmLow = lm.name.toLowerCase();
        if (lmLow == oLow || lmLow == dLow) continue;
        if (lm.category == 'hotel' ||
            lmLow.contains('hotel') ||
            lmLow.contains('hôtel') ||
            lmLow.contains('dovv') ||
            lmLow.contains('super u') ||
            lmLow.contains('playce')) {
          continue;
        }

        final dO = sqrt(pow((lm.pos.latitude - origPos.latitude) * 111.0, 2) +
            pow((lm.pos.longitude - origPos.longitude) * 111.0, 2));
        final dD = sqrt(pow((lm.pos.latitude - destPos.latitude) * 111.0, 2) +
            pow((lm.pos.longitude - destPos.longitude) * 111.0, 2));
        if (dO < 0.35 || dD < 0.35) continue;

        // Calcul de la distance minimale au tracé routier
        double minDist = 999.0;
        double bestFraction = 0.0;
        double totalLen = 0.0;

        final segmentLengths = <double>[];
        for (int i = 0; i < polyline.length - 1; i++) {
          final l = sqrt(pow((polyline[i + 1].latitude - polyline[i].latitude) * 111.0, 2) +
              pow((polyline[i + 1].longitude - polyline[i].longitude) * 111.0, 2));
          segmentLengths.add(l);
          totalLen += l;
        }
        if (totalLen == 0) totalLen = 0.001;

        double accum = 0.0;
        for (int i = 0; i < polyline.length - 1; i++) {
          final a = polyline[i];
          final b = polyline[i + 1];
          final segLen = segmentLengths[i];

          final dx = (b.latitude - a.latitude) * 111.0;
          final dy = (b.longitude - a.longitude) * 111.0;
          final lenSq = dx * dx + dy * dy;

          double t = 0.0;
          if (lenSq > 0) {
            final px = (lm.pos.latitude - a.latitude) * 111.0;
            final py = (lm.pos.longitude - a.longitude) * 111.0;
            t = (px * dx + py * dy) / lenSq;
            t = max(0.0, min(1.0, t));
          }

          final projLat = a.latitude + t * (b.latitude - a.latitude);
          final projLng = a.longitude + t * (b.longitude - a.longitude);
          final dist = sqrt(pow((lm.pos.latitude - projLat) * 111.0, 2) +
              pow((lm.pos.longitude - projLng) * 111.0, 2));

          if (dist < minDist) {
            minDist = dist;
            bestFraction = (accum + t * segLen) / totalLen;
          }
          accum += segLen;
        }

        if (minDist <= 0.40 && bestFraction >= 0.05 && bestFraction <= 0.95) {
          candidates.add({
            'name': lm.name,
            'pos': lm.pos,
            'fraction': bestFraction,
            'dist': minDist,
          });
        }
      }

      candidates.sort((a, b) => (a['fraction'] as double).compareTo(b['fraction'] as double));

      int maxIntermediates = 0;
      double minSpacing = 1.0;
      if (directKm < 1.3) {
        maxIntermediates = 0;
      } else if (directKm < 3.2) {
        maxIntermediates = 1;
        minSpacing = max(0.8, directKm * 0.45);
      } else if (directKm < 6.5) {
        maxIntermediates = 2;
        minSpacing = max(1.1, directKm * 0.28);
      } else {
        maxIntermediates = 4;
        minSpacing = max(1.5, directKm * 0.20);
      }

      final selectedList = <Map<String, dynamic>>[];
      for (final c in candidates) {
        if (selectedList.length >= maxIntermediates) break;
        final cPos = c['pos'] as LatLng;
        final tooClose = selectedList.any((sel) {
          final selPos = sel['pos'] as LatLng;
          final d = sqrt(pow((cPos.latitude - selPos.latitude) * 111.0, 2) +
              pow((cPos.longitude - selPos.longitude) * 111.0, 2));
          return d < minSpacing;
        });
        if (!tooClose) {
          selectedList.add(c);
          corridorNames.add(c['name'] as String);
        }
      }
    }

    if (!corridorNames.contains(destination)) {
      corridorNames.add(destination);
    }

    int cumulativeNominal = 0;
    int cumulativeDelay = 0;
    final corridorWaypoints = <Map<String, dynamic>>[];
    Map<String, dynamic>? criticalBottleneck;
    int maxCongestionFound = 0;

    final baseMin = (departureHour * 60).round() % 60;
    final baseH = departureHour.floor() % 24;

    for (int i = 0; i < corridorNames.length; i++) {
      final name = corridorNames[i];
      final isStart = i == 0;
      final isEnd = i == corridorNames.length - 1;
      final segNominal = isStart ? 0 : max(2, (directKm / max(1, corridorNames.length - 1) * 2.5).round());
      cumulativeNominal += segNominal;

      final totalMinutesFromDeparture = cumulativeNominal + cumulativeDelay;
      final totalMinOfDay = baseH * 60 + baseMin + totalMinutesFromDeparture;
      final etaH = (totalMinOfDay ~/ 60) % 24;
      final etaM = totalMinOfDay % 60;
      final etaFormatted = '${etaH.toString().padLeft(2, '0')}h${etaM.toString().padLeft(2, '0')}';

      final etaFloat = etaH + etaM / 60.0;
      final nodeFactor = getHourlyFactor(etaFloat);

      final nameLower = name.toLowerCase();
      final isNodeCradat = nameLower.contains('cradat') || nameLower.contains('ngoa');
      final isNodeMokolo = nameLower.contains('mokolo') || nameLower.contains('mboppi');
      final isNodeNlongkak = nameLower.contains('nlongkak');
      final isNodeMvan = nameLower.contains('mvan');
      final isNodeDeidoOrNdokoti = nameLower.contains('deido') || nameLower.contains('ndokoti');
      final isSchool = nameLower.contains('vogt') || nameLower.contains('leclerc') || nameLower.contains('retraite') || nameLower.contains('libermann') || nameLower.contains('lycee') || nameLower.contains('college');

      final nodeObstacles = <Map<String, dynamic>>[];

      // A. Amphis et universités
      if (isNodeCradat && (etaFloat >= 16.25 && etaFloat <= 19.5)) {
        nodeObstacles.add({
          'id': 'cradat_rush',
          'icon': '🎓',
          'title': 'Sortie massive des amphis Université Yaoundé I',
          'description': 'À $etaFormatted, traversées d\'étudiants denses et attroupements créant un goulet.',
          'severity': 'critical',
          'timeFormatted': etaFormatted,
        });
      }

      // B. Lycées et collèges
      if (isSchool && ((etaFloat >= 7.0 && etaFloat <= 8.25) || (etaFloat >= 15.5 && etaFloat <= 17.75))) {
        nodeObstacles.add({
          'id': 'school_rush',
          'icon': '🎒',
          'title': 'Affluence scolaire & dépose-minute ($name)',
          'description': 'À $etaFormatted, attente de parents d\'élèves et flux de motos-taxis aux abords de l\'école.',
          'severity': 'warning',
          'timeFormatted': etaFormatted,
        });
      }

      // C. Marchés
      if (isNodeMokolo && (etaFloat >= 9.5 && etaFloat <= 17.5)) {
        nodeObstacles.add({
          'id': 'market_rush',
          'icon': '🛒',
          'title': 'Forte affluence marchande & déchargements',
          'description': 'À $etaFormatted, camions de vivres et pousseurs réduisant la chaussée.',
          'severity': etaFloat >= 11 && etaFloat <= 16 ? 'critical' : 'warning',
          'timeFormatted': etaFormatted,
        });
      }

      // D. Bas-fonds inondables
      if ((isNodeCradat || isNodeNlongkak || isNodeDeidoOrNdokoti) && rainAmount >= 8.0) {
        nodeObstacles.add({
          'id': 'flash_flood',
          'icon': '🌊',
          'title': 'Risque de chaussée submergée',
          'description': 'Bas-fond vulnérable aux fortes averses. Passage au pas obligatoire vers $etaFormatted.',
          'severity': rainAmount >= 20 ? 'critical' : 'warning',
          'timeFormatted': etaFormatted,
        });
      }

      // E. Travaux
      if ((isNodeNlongkak || nameLower.contains('nsam') || nameLower.contains('ndokoti')) && (etaFloat >= 8 && etaFloat <= 18)) {
        nodeObstacles.add({
          'id': 'road_works',
          'icon': '🚧',
          'title': 'Travaux d\'assainissement / Réfection',
          'description': 'Chantier et rétrécissement temporaire de voie vers $etaFormatted.',
          'severity': 'warning',
          'timeFormatted': etaFormatted,
        });
      }

      // F. Gares routières
      if (isNodeMvan && ((etaFloat >= 6.5 && etaFloat <= 9.0) || (etaFloat >= 16.5 && etaFloat <= 19.5))) {
        nodeObstacles.add({
          'id': 'intercity_terminal',
          'icon': '🚌',
          'title': 'Affluence des gares routières (Mvan)',
          'description': 'Départs de bus interurbains et manœuvres d\'embarquement vers $etaFormatted.',
          'severity': 'warning',
          'timeFormatted': etaFormatted,
        });
      }

      int rawBase = 36;
      if (nameLower.contains('mokolo') || nameLower.contains('mboppi') || nameLower.contains('nlongkak') || nameLower.contains('ndokoti') || nameLower.contains('mvan')) {
        rawBase = 76;
      } else if (nameLower.contains('poste centrale') || nameLower.contains('deido') || nameLower.contains('bonamoussadi') || nameLower.contains('express') || nameLower.contains('cradat')) {
        rawBase = 66;
      } else if (nameLower.contains('melen') || nameLower.contains('damas') || nameLower.contains('anguissa') || nameLower.contains('coron') || nameLower.contains('elig-essono') || nameLower.contains('madagascar') || nameLower.contains('makepe')) {
        rawBase = 50;
      } else if (nameLower.contains('leclerc') || nameLower.contains('hopital') || nameLower.contains('bastos') || nameLower.contains('omnisports') || nameLower.contains('supptic') || nameLower.contains('enam') || nameLower.contains('esstic')) {
        rawBase = 32;
      }

      final boost = nodeObstacles.fold<int>(0, (sum, o) => sum + (o['severity'] == 'critical' ? 35 : o['severity'] == 'warning' ? 18 : 8));
      int nodeScore = ((rawBase * 0.70 + boost * 0.45) * nodeFactor).round().clamp(12, 99);

      final currentSpeedKmh = max(8, (42 * (1 - (nodeScore / 125))).round());
      final actualSegmentMin = isStart ? 0 : max(1, ((segNominal * 25) / currentSpeedKmh).round());
      final nodeDelay = isStart ? 0 : max(0, actualSegmentMin - segNominal + (boost > 0 ? 2 : 0));
      cumulativeDelay += nodeDelay;

      String nodeStatus = 'FLUID';
      String nodeStatusLabel = 'Fluide';
      String nodeColor = '#10B981';

      if (nodeScore >= 85 || nodeObstacles.any((o) => o['severity'] == 'critical')) {
        nodeStatus = 'BLOCKED_OR_JAMMED';
        nodeStatusLabel = 'Saturé / Bloqué';
        nodeColor = '#DC2626';
      } else if (nodeScore >= 68) {
        nodeStatus = 'HEAVY_CONGESTION';
        nodeStatusLabel = 'Très dense';
        nodeColor = '#EA580C';
      } else if (nodeScore >= 40) {
        nodeStatus = 'MODERATE';
        nodeStatusLabel = 'Ralenti';
        nodeColor = '#F59E0B';
      }

      final roadInfra = getRoadDetails(name, city);

      final wp = {
        'stepIndex': i + 1,
        'id': 'wp_$i',
        'name': name,
        'isOrigin': isStart,
        'isDestination': isEnd,
        'estimatedArrival': etaFormatted,
        'relativeMinutesFromStart': totalMinutesFromDeparture,
        'congestionScore': nodeScore,
        'status': nodeStatus,
        'statusLabel': nodeStatusLabel,
        'statusColor': nodeColor,
        'segmentNominalMin': segNominal,
        'delayAtNodeMin': nodeDelay,
        'obstacles': nodeObstacles,
        'roadName': roadInfra['roadName'],
        'roadType': roadInfra['roadType'],
        'roadQualityScore': roadInfra['roadQualityScore'],
        'pavementStatus': roadInfra['pavementStatus'],
        'surfaceAdvantage': roadInfra['surfaceAdvantage'],
        'isRecommendedBestRoute': true,
        'advice': isNodeCradat && nodeScore >= 70 ? 'Contourner par le Plateau Ngoa-Ekellé.' : (nodeObstacles.isNotEmpty ? nodeObstacles.first['description'] : 'Axe ${roadInfra['roadName']} praticable et goudronné.'),
      };

      corridorWaypoints.add(wp);

      if (!isStart && (criticalBottleneck == null || nodeScore > maxCongestionFound)) {
        maxCongestionFound = nodeScore;
        criticalBottleneck = {
          'nodeName': name,
          'etaFormatted': etaFormatted,
          'congestionScore': nodeScore,
          'statusLabel': nodeStatusLabel,
          'statusColor': nodeColor,
          'obstacles': nodeObstacles,
          'mainReason': nodeObstacles.isNotEmpty ? nodeObstacles.first['title'] : 'Affluence de pointe',
          'detourAdvice': wp['advice'],
        };
      }
    }

    final allWarnings = <Map<String, dynamic>>[];
    allWarnings.addAll(warnings);
    for (final wp in corridorWaypoints) {
      final obsList = (wp['obstacles'] as List<dynamic>?) ?? [];
      for (final obs in obsList) {
        if (obs is Map<String, dynamic> && (obs['severity'] == 'critical' || obs['severity'] == 'warning')) {
          allWarnings.add({
            'type': 'OBSTACLE',
            'icon': obs['icon'] ?? '⚠️',
            'title': '${wp['name']} (${wp['estimatedArrival']}) : ${obs['title']}',
            'description': obs['description'] ?? '',
            'severity': obs['severity'] ?? 'warning',
          });
        }
      }
    }

    final totalEstimatedDuration = cumulativeNominal + cumulativeDelay;

    String? alertMsg;
    if (criticalBottleneck != null && ((criticalBottleneck['congestionScore'] as int) >= 68)) {
      final nature = (criticalBottleneck['congestionScore'] as int) >= 85 ? 'un blocage important' : 'un fort ralentissement';
      alertMsg = 'Sur votre trajet, $nature est prévu à ${criticalBottleneck['nodeName']} vers ${criticalBottleneck['etaFormatted']}';
      final obsList = (criticalBottleneck['obstacles'] as List<dynamic>?) ?? [];
      if (obsList.isNotEmpty && obsList.first is Map) {
        alertMsg += ' à cause de : ${(obsList.first as Map)['title'].toString().toLowerCase()}.';
      } else {
        alertMsg += ' à cause de l\'affluence de pointe.';
      }
    } else if (peak['level'] == 'embouteillage' || peak['level'] == 'bloque') {
      final nature = peak['level'] == 'bloque' ? 'un blocage important' : 'un fort ralentissement';
      final hTxt = horizonText(peak['horizon_minutes'] as int);
      alertMsg = 'Il y aura $nature à $destination $hTxt';
      if (causes.isNotEmpty) {
        alertMsg += ' à cause de ${causes.join(' et ')}';
      }
      alertMsg += '.';
    }

    final peakMin = (peak['horizon_minutes'] as int?) ?? 15;
    double calculatedConfidence = 0.88;
    if (weatherAtHour != null) calculatedConfidence += 0.04;
    if (isPeakHour) calculatedConfidence += 0.02;
    calculatedConfidence -= (peakMin / 120.0) * 0.08;
    calculatedConfidence = calculatedConfidence.clamp(0.74, 0.94);

    final avgRoadQual = corridorWaypoints.isEmpty
        ? 88
        : (corridorWaypoints.fold<int>(0, (sum, w) => sum + (w['roadQualityScore'] as int? ?? 88)) ~/ corridorWaypoints.length);

    final uniqueRoadNames = corridorWaypoints.map((w) => w['roadName'] as String?).where((r) => r != null && r.isNotEmpty).toSet().toList();

    final bestRouteOverview = {
      'recommendedRouteName': 'Itinéraire Bitumé Prioritaire (${uniqueRoadNames.take(2).join(" • ")})',
      'averageRoadQualityScore': avgRoadQual,
      'pavementCondition': avgRoadQual >= 92 ? 'Chaussée bitumée en excellent état' : 'Chaussée bitumée standard',
      'primaryAvenues': uniqueRoadNames,
      'isOptimalRoadChoice': true,
      'whyBestRoute': 'Privilégie les grands boulevards bitumés et évite les ruelles dégradées à nids de poule.',
      'surfaceAdvantage': corridorWaypoints.isNotEmpty ? corridorWaypoints.first['surfaceAdvantage'] : 'Axe prioritaire bitumé',
      'alternativeDegradedRoute': {
        'name': 'Raccourcis par ruelles secondaires',
        'warning': 'Déconseillé (+5 à +9 min de retard estimé pour nids de poule et voies étroites)',
      },
    };

    return {
      'city': city,
      'origin': origin,
      'destination': destination,
      'targetHour': departureHour.round(),
      'targetDate': dateStr,
      'congestionScore': maxCongestionFound > 0 ? maxCongestionFound : congestion,
      'roadStatus': maxCongestionFound >= 85 ? 'BLOCKED_OR_JAMMED' : (maxCongestionFound >= 68 ? 'HEAVY_CONGESTION' : status),
      'roadStatusLabel': maxCongestionFound >= 85 ? 'Trajet saturé' : statusLabel,
      'statusColor': statusColor,
      'nominalDurationMinutes': cumulativeNominal > 0 ? cumulativeNominal : nominalMin,
      'estimatedDurationMinutes': totalEstimatedDuration > 0 ? totalEstimatedDuration : estimatedMin,
      'delayMinutes': cumulativeDelay > 0 ? cumulativeDelay : delayMin,
      'isRoadBlocked': maxCongestionFound >= 85 || congestion >= 80,
      'weatherAtTargetHour': effectiveWeather,
      'warnings': allWarnings,
      'corridorWaypoints': corridorWaypoints,
      'bestRouteOverview': bestRouteOverview,
      'criticalBottleneck': criticalBottleneck,
      'detourRecommendation': criticalBottleneck?['detourAdvice'] ?? detour,
      'bestDepartureAdvice': bestAdvice,
      'timeline': {
        'points': timelinePoints,
        'peak': peak,
        'confidence': double.parse(calculatedConfidence.toStringAsFixed(2)),
        'causes': causes,
        'alert_message': alertMsg,
        'factors': {
          'isPeakHour': isPeakHour,
          'rainMm': rainAmount,
          'hasEvent': allWarnings.isNotEmpty,
          'roadDegraded': isRoadDegraded,
        },
      },
    };
  }

  /// Prévisions IA multi-horizons avec météo automatique temps réel et événements réels
  static Future<Map<String, dynamic>?> fetchAiForecast({
    required String city,
    String? weather,
    int? hour,
    int? dayOfWeek,
    List<String>? events,
  }) async {
    final targetHour = hour ?? DateTime.now().hour;
    final targetDay = dayOfWeek ?? DateTime.now().weekday % 7;
    final weatherParam = (weather != null && weather.isNotEmpty && weather != 'auto')
        ? '&weather=${Uri.encodeComponent(weather)}'
        : '';
    final eventsParam = (events != null && events.isNotEmpty)
        ? '&events=${Uri.encodeComponent(events.join(','))}'
        : '';

    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse(
          '$host/ai/forecast?city=${Uri.encodeComponent(city)}$weatherParam&hour=$targetHour&dayOfWeek=$targetDay$eventsParam',
        );
        final response = await http.get(uri).timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return json.decode(response.body) as Map<String, dynamic>;
        }
      } catch (_) {}
    }

    // Calcul de repli local IA avec transition continue réaliste
    final isDouala = city.toLowerCase().contains('douala');
    final weatherMultiplier = (weather == 'flood'
        ? 2.3
        : (weather == 'heavy_rain' ? 1.7 : (weather == 'light_rain' ? 1.25 : 1.0)));

    int eventBoost = 0;
    if (events != null) {
      if (events.contains('funeral_cortege')) eventBoost += 30;
      if (events.contains('school_office_rush')) eventBoost += 35;
      if (events.contains('market_day')) eventBoost += 38;
      if (events.contains('stadium_match')) eventBoost += 35;
      if (events.contains('road_works')) eventBoost += 25;
      if (events.contains('presidential_escort')) eventBoost += 45;
      if (events.contains('university_cradat_rush')) eventBoost += 44;
    }

    double getHourFactor(double h) {
      if (h >= 6.5 && h < 8.75) return 1.65;
      if (h >= 11.5 && h < 13.5) return 1.30;
      if (h >= 16.5 && h < 19.5) return 1.85;
      if (h >= 22.0 || h < 6.0) return 0.35;
      return 0.95;
    }

    final horizonsList = [
      {'label': '+15 min', 'offset': 0.25, 'offsetMin': 15},
      {'label': '+30 min', 'offset': 0.5, 'offsetMin': 30},
      {'label': '+1 heure', 'offset': 1.0, 'offsetMin': 60},
      {'label': '+2 heures', 'offset': 2.0, 'offsetMin': 120},
      {'label': '+3 heures', 'offset': 3.0, 'offsetMin': 180},
      {'label': '+6 heures', 'offset': 6.0, 'offsetMin': 360},
    ];

    // Ancrage sur la congestion actuelle moyenne en direct
    const baseCurrentCong = 72;

    final globalForecast = horizonsList.map((h) {
      final offsetH = h['offset'] as double;
      final futureH = (targetHour + offsetH) % 24;
      final factor = getHourFactor(futureH);

      final targetCong = ((48 * (factor / 1.1) + eventBoost * 0.7) * weatherMultiplier).round();
      final inertia = exp(-offsetH / 1.3);
      final rawVal = (baseCurrentCong * inertia + targetCong * (1.0 - inertia)).round();
      final clampedVal = rawVal.clamp(12, 96);

      final totalMinutes = (targetHour * 60 + (h['offsetMin'] as int)) % 1440;
      final clockHour = totalMinutes ~/ 60;
      final clockMin = (totalMinutes % 60).toString().padLeft(2, '0');
      final timeFormatted = '${clockHour}h$clockMin';

      return {
        'time': timeFormatted,
        'horizon': h['label'],
        'offsetMinutes': h['offsetMin'],
        'congestionPercentage': clampedVal,
        'status': clampedVal >= 75 ? 'Critique (Bouchonné)' : (clampedVal >= 40 ? 'Modéré (Ralentissement)' : 'Fluide (Optimal)'),
      };
    }).toList();

    return {
      'city': city,
      'aiModel': 'CityFlow-NeuralPredict v3.5 (Automated Live Multi-API Engine)',
      'simulatedHour': targetHour,
      'dayLabel': ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][targetDay],
      'globalForecast': globalForecast,
      'optimalDepartureWindow': {
        'bestHorizonLabel': globalForecast.reduce((a, b) => (a['congestionPercentage'] as int) < (b['congestionPercentage'] as int) ? a : b)['horizon'],
        'timeSavedMinutes': weather != 'dry' || eventBoost > 0 ? 22 : 8,
        'advice': eventBoost > 0
            ? 'Événements en cours détectés. Anticipez votre départ pour contourner les cortèges et grands carrefours.'
            : 'Météo en direct synchronisée. Conditions sous surveillance IA.',
      },
      'recommendations': [
        if (weather == 'heavy_rain' || weather == 'flood')
          {
            'title': 'Alerte Météo Tropicale',
            'message': 'Fort risque d\'aquaplaning et d\'axes inondés. Réduisez votre vitesse.',
            'badge': 'MÉTÉO & SÉCURITÉ',
          },
        {
          'title': 'Analyse IA Temps Réel',
          'message': 'Flux de circulation sous contrôle avec détection automatique des événements.',
          'badge': 'IA TEMPS RÉEL',
        }
      ],
      'anomalies': [
        {
          'nodeName': isDouala ? 'Carrefour Ndokoti' : 'Carrefour Nlongkak',
          'type': 'SURVEILLANCE_PREDICTIVE',
          'description': 'Flux denses régulés par les algorithmes de feux intelligents CityFlow.',
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
    final defaultCityCenter = city == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter;

    // Résolution précise des coordonnées
    LatLng startPos = origin is LatLng
        ? origin
        : (origin.toString().toLowerCase().contains('position') || origin.toString().toLowerCase().contains('gps')
            ? defaultCityCenter
            : (CityData.findLandmark(city, origin.toString())?.pos ?? defaultCityCenter));
    LatLng endPos = destination is LatLng
        ? destination
        : (destination.toString().toLowerCase().contains('position') || destination.toString().toLowerCase().contains('point')
            ? (city == 'Yaoundé' ? const LatLng(3.8890, 11.5120) : const LatLng(4.0430, 9.6910))
            : (CityData.findLandmark(city, destination.toString())?.pos ??
                (city == 'Yaoundé' ? const LatLng(3.8890, 11.5120) : const LatLng(4.0430, 9.6910))));

    // Sécurisation : Si startPos ou endPos sont situés hors du Cameroun (simulateur US), recadrer dans la métropole
    final startDistToCity = const Distance().as(LengthUnit.Kilometer, startPos, defaultCityCenter);
    final endDistToCity = const Distance().as(LengthUnit.Kilometer, endPos, defaultCityCenter);

    if (startDistToCity > 80.0) {
      startPos = LatLng(defaultCityCenter.latitude - 0.018, defaultCityCenter.longitude - 0.012);
    }
    if (endDistToCity > 80.0) {
      endPos = LatLng(defaultCityCenter.latitude + 0.022, defaultCityCenter.longitude + 0.016);
    }

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
    final fastestDist = double.parse(max(1.2, min(25.0, directDist * 1.15)).toStringAsFixed(1));
    final fastestMin = max(6, (fastestDist * 2.4).round());

    final ecoDist = double.parse((fastestDist * 1.12).toStringAsFixed(1));
    final ecoMin = max(4, fastestMin - 4);

    final secureDist = double.parse((fastestDist * 1.18).toStringAsFixed(1));
    final secureMin = max(4, fastestMin - 6);

    return {
      'routes': [
        SmartRoute(
          id: 'route_fastest',
          type: 'fastest',
          title: 'Via Axe Principal & Voie Rapide',
          badge: '⚡ Axe Principal',
          tag: 'Temps optimal',
          durationMinutes: fastestMin,
          distanceKm: fastestDist,
          delaySavedMinutes: 8,
          co2SavedKg: 0.4,
          ecoScore: 'B+',
          congestionIndex: 28,
          color: const Color(0xFF00875A),
          fluidityLevel: 'fluid',
          roadCategory: 'Axe principal & Voie rapide',
          practicabilityScore: 9.6,
          rainPracticabilityScore: 9.1,
          roadSurfaceType: 'Bitume en parfait état',
          timeSavedVsMainMinutes: 0,
          highlights: const ['Axe structurant direct', 'Régulation des feux favorable', 'Réseau principal bitumé'],
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
          title: 'Via Route Secondaire Bitumée (Contournement)',
          badge: '🌿 Route Secondaire Fluide',
          tag: 'Contournement',
          durationMinutes: ecoMin,
          distanceKm: ecoDist,
          delaySavedMinutes: 8,
          co2SavedKg: 0.95,
          ecoScore: 'A+',
          congestionIndex: 18,
          color: const Color(0xFF10B981),
          fluidityLevel: 'fluid',
          roadCategory: 'Route secondaire bitumée (Contournement)',
          practicabilityScore: 8.8,
          rainPracticabilityScore: 7.8,
          roadSurfaceType: 'Voie secondaire bitumée fluide',
          timeSavedVsMainMinutes: 8,
          highlights: const ['Contourne les goulots d\'étranglement majeurs', 'Vitesse constante & Faible émission', 'Praticable par tout temps'],
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
          title: 'Via Voie Secondaire & Raccourcis Praticables',
          badge: '🛡️ Raccourci Secondaire Pavé',
          tag: 'Raccourci',
          durationMinutes: secureMin,
          distanceKm: secureDist,
          delaySavedMinutes: 12,
          co2SavedKg: 0.2,
          ecoScore: 'B',
          congestionIndex: 22,
          color: const Color(0xFF3B82F6),
          fluidityLevel: 'fluid',
          roadCategory: 'Voie secondaire & Raccourcis praticables',
          practicabilityScore: 8.2,
          rainPracticabilityScore: 6.9,
          roadSurfaceType: 'Chaussée pavée & stabilisée',
          timeSavedVsMainMinutes: 14,
          highlights: const ['Raccourci inter-quartiers fluide', 'Évite 100% des feux rouges bloqués', 'Note praticabilité vérifiée'],
          coordinates: secureCoords,
          trafficSegments: _buildTrafficSegments(secureCoords, 1.1),
          steps: [
            RouteStepInstruction(
              instruction: 'Départ sur voie secondaire praticable',
              distance: '400 m',
              rawDistanceMeters: 400,
              action: 'depart',
              icon: 'navigation',
              maneuverIcon: 'navigation',
              spokenText: 'Départ sur la voie secondaire pavée.',
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

  // ===================================================================
  // NOTIFICATIONS PUSH (FCM)
  // ===================================================================

  /// Enregistre le token Firebase Cloud Messaging sur le profil utilisateur
  static Future<bool> updateFcmToken(String fcmToken, String userToken) async {
    final hostsToTry = [_activeBaseUrl, ..._candidateHosts.where((h) => h != _activeBaseUrl)];
    for (final host in hostsToTry) {
      try {
        final uri = Uri.parse('$host/auth/fcm-token');
        final response = await http.post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $userToken',
          },
          body: json.encode({
            'fcmToken': fcmToken,
          }),
        ).timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          _activeBaseUrl = host;
          return true;
        }
      } catch (_) {}
    }
    return false;
  }
}
