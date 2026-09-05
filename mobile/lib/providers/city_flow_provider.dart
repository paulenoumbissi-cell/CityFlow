import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../models/traffic_node.dart';
import '../models/incident_alert.dart';
import '../models/priority_route.dart';
import '../models/citizen_report.dart';
import '../models/citizen_reward.dart';
import '../models/emergency_mission.dart';
import '../models/smart_route.dart';
import '../models/saved_place.dart';
import '../models/scheduled_trip.dart';
import '../models/trip_history_item.dart';
import '../models/community_driver.dart';
import '../core/constants/city_data.dart';
import '../core/services/location_service.dart';
import '../core/services/api_service.dart';
import '../core/services/websocket_service.dart';

class CityFlowProvider extends ChangeNotifier {
  String _selectedCity = 'Yaoundé';
  List<TrafficNode> _yaoundeNodes = [];
  List<TrafficNode> _doualaNodes = [];
  List<IncidentAlert> _alerts = [];
  List<PriorityRoute> _priorityRoutes = [];

  // Crowdsourcing & Gamification
  List<CitizenReport> _citizenReports = [];
  CitizenProfileData? _citizenProfile;
  List<CatalogRewardItem> _rewardsCatalog = [];

  // Mode Secours & Onde Verte
  EmergencyMission? _activeEmergencyMission;

  // Lieux Favoris, Planificateur IA & Historique
  List<SavedPlace> _savedPlaces = [];
  List<ScheduledTrip> _scheduledTrips = [];
  List<TripHistoryItem> _tripHistory = [];

  // Itinéraires Multi-Critères & Éco-Mobilité
  List<SmartRoute> _smartRoutes = [];
  SmartRoute? _selectedSmartRoute;
  List<MultimodalOption> _multimodalOptions = [];
  String _activeTravelMode = 'car';
  bool _isSmartRouteLoading = false;
  bool _isGpsNavigating = false;
  int _navStepIndex = 0;
  int _navCoordinateIndex = 0;
  LatLng? _navUserPosition;
  double _navBearing = 0.0;
  double _navSpeedKmh = 38.0;
  bool _navCompleted = false;
  StreamSubscription? _gpsStreamSub;

  // Vocal Guidance & Simulation
  final FlutterTts _flutterTts = FlutterTts();
  bool _voiceGuidanceEnabled = true;
  bool _isNavAutoSimulating = false;
  Timer? _navAutoSimTimer;
  final int _simulatedSpeedKmh = 42;

  // Profil de Conduite & Véhicules Connectés CityFlow
  String _userMood = 'cool';
  String _userMoodEmoji = '';
  String _userMoodLabel = 'Standard';
  bool _hasDetourAlert = false;
  String? _detourReason;
  int? _detourTimeSavedMinutes;

  TrafficNode? _selectedNode;
  PriorityRoute? _activePriorityRoute;
  bool _isEmergencyModeActive = false;
  bool _isLiveSimulating = true;
  Timer? _simulationTimer;

  // GPS & Localisation Automatique
  bool _isAutoLocating = false;
  bool _isGpsLive = false;
  LatLng? _userRealPosition;
  String? _locationStatusMessage;
  bool _isDisposed = false;

  // WebSocket Live Push
  final CityFlowWebSocketService _wsService = CityFlowWebSocketService();
  StreamSubscription<WsConnectionStatus>? _wsStatusSub;
  StreamSubscription<Map<String, dynamic>>? _wsMessageSub;

  CityFlowProvider() {
    _loadInitialData();
    _startLiveSimulation();
    _initWebSocket();
    refreshCitizenData();
    checkEmergencyStatus();
    fetchSmartRoutes();
    autoDetectUserCity();
  }

  // Getters
  String get selectedCity => _selectedCity;
  LatLng get currentCityCenter => _selectedCity == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter;
  
  bool get isAutoLocating => _isAutoLocating;
  bool get isGpsLive => _isGpsLive;
  LatLng? get userRealPosition => _userRealPosition;
  String? get locationStatusMessage => _locationStatusMessage;

  List<TrafficNode> get currentNodes => _selectedCity == 'Yaoundé' ? _yaoundeNodes : _doualaNodes;
  List<TrafficNode> get allNodes => [..._yaoundeNodes, ..._doualaNodes];
  TrafficNode? get selectedNode => _selectedNode;
  
  List<IncidentAlert> get currentCityAlerts => _alerts.where((a) => a.city == _selectedCity).toList();
  List<IncidentAlert> get allAlerts => _alerts;

  // Crowdsourcing getters
  List<CitizenReport> get currentCityCitizenReports =>
      _citizenReports.where((r) => r.city == _selectedCity && r.status == 'active').toList();
  List<CitizenReport> get allCitizenReports => _citizenReports;
  CitizenProfileData? get citizenProfile => _citizenProfile;
  List<CatalogRewardItem> get rewardsCatalog => _rewardsCatalog;
  int get citizenPoints => _citizenProfile?.reputationScore ?? 320;
  
  List<PriorityRoute> get currentCityPriorityRoutes => _priorityRoutes;
  PriorityRoute? get activePriorityRoute => _activePriorityRoute;
  bool get isEmergencyModeActive => _isEmergencyModeActive;
  bool get isLiveSimulating => _isLiveSimulating;

  // Smart Routes & Navigation getters
  List<SmartRoute> get smartRoutes => _smartRoutes;
  SmartRoute? get selectedSmartRoute => _selectedSmartRoute;
  List<MultimodalOption> get multimodalOptions => _multimodalOptions;
  String get activeTravelMode => _activeTravelMode;
  bool get isSmartRouteLoading => _isSmartRouteLoading;
  bool get isGpsNavigating => _isGpsNavigating;
  int get navStepIndex => _navStepIndex;
  int get navCoordinateIndex => _navCoordinateIndex;
  bool get navCompleted => _navCompleted;
  bool get voiceGuidanceEnabled => _voiceGuidanceEnabled;
  bool get isNavAutoSimulating => _isNavAutoSimulating;
  int get simulatedSpeedKmh => _simulatedSpeedKmh;
  double get navBearing => _navBearing;
  double get navSpeedKmh => _navSpeedKmh;
  List<CityLandmark> get currentCityLandmarks => CityData.getLandmarks(_selectedCity);

  LatLng get currentNavPosition {
    if (_navUserPosition != null) return _navUserPosition!;
    if (_selectedSmartRoute != null && _selectedSmartRoute!.coordinates.isNotEmpty) {
      return _selectedSmartRoute!.coordinates.first;
    }
    return _userRealPosition ?? currentCityCenter;
  }

  double get navRemainingDistanceKm {
    if (_selectedSmartRoute == null || _selectedSmartRoute!.coordinates.isEmpty) return 0.0;
    final totalCoords = _selectedSmartRoute!.coordinates.length;
    if (totalCoords <= 1) return _selectedSmartRoute!.distanceKm;
    final progress = (_navCoordinateIndex / (totalCoords - 1)).clamp(0.0, 1.0);
    return double.parse((_selectedSmartRoute!.distanceKm * (1.0 - progress)).toStringAsFixed(1));
  }

  int get navRemainingMinutes {
    if (_selectedSmartRoute == null || _selectedSmartRoute!.coordinates.isEmpty) return 0;
    final totalCoords = _selectedSmartRoute!.coordinates.length;
    if (totalCoords <= 1) return _selectedSmartRoute!.durationMinutes;
    final progress = (_navCoordinateIndex / (totalCoords - 1)).clamp(0.0, 1.0);
    return max(1, (_selectedSmartRoute!.durationMinutes * (1.0 - progress)).round());
  }

  double get navProgressPercent {
    if (_selectedSmartRoute == null || _selectedSmartRoute!.coordinates.isEmpty) return 0.0;
    final totalCoords = _selectedSmartRoute!.coordinates.length;
    if (totalCoords <= 1) return 1.0;
    return (_navCoordinateIndex / (totalCoords - 1)).clamp(0.0, 1.0);
  }

  int get navNextManeuverDistanceMeters {
    if (_selectedSmartRoute == null || _selectedSmartRoute!.steps.isEmpty) return 0;
    final steps = _selectedSmartRoute!.steps;
    final coords = _selectedSmartRoute!.coordinates;
    if (coords.isEmpty) return 0;

    final currentPos = currentNavPosition;
    final idx = _navStepIndex.clamp(0, steps.length - 1);
    final targetStep = (idx + 1 < steps.length) ? steps[idx + 1] : steps[idx];

    if (targetStep.position != null) {
      final d = const Distance().as(LengthUnit.Meter, currentPos, targetStep.position!);
      return max(10, d.round());
    }

    final stepFraction = 1.0 / steps.length;
    final targetCoordIdx = ((idx + 1) * stepFraction * (coords.length - 1)).round().clamp(0, coords.length - 1);
    final ptsLeft = (targetCoordIdx - _navCoordinateIndex).clamp(0, coords.length);
    return max(15, ptsLeft * 35);
  }

  String get navNextManeuverDistanceLabel {
    if (_navCompleted) return 'Arrivée !';
    final d = navNextManeuverDistanceMeters;
    if (d <= 25) {
      return 'Maintenant';
    } else if (d < 1000) {
      final rounded = ((d / 10).round() * 10).clamp(10, 990);
      return '$rounded m';
    } else {
      return '${(d / 1000.0).toStringAsFixed(1)} km';
    }
  }

  // Profil de Conduite & Véhicules Connectés CityFlowers
  String get userMood => _userMood;
  String get userMoodEmoji => _userMoodEmoji;
  String get userMoodLabel => _userMoodLabel;
  List<CommunityDriver> get nearbyCommunityDrivers => CityData.getNearbyDrivers(_selectedCity);
  bool get hasDetourAlert => _hasDetourAlert;
  String? get detourReason => _detourReason;
  int? get detourTimeSavedMinutes => _detourTimeSavedMinutes;

  void setUserMood(String mood, String emoji, String label) {
    _userMood = mood;
    _userMoodEmoji = emoji;
    _userMoodLabel = label;
    notifyListeners();
  }

  void triggerDetourAlert({required String reason, required int timeSavedMinutes}) {
    _hasDetourAlert = true;
    _detourReason = reason;
    _detourTimeSavedMinutes = timeSavedMinutes;
    notifyListeners();
  }

  void dismissDetourAlert() {
    _hasDetourAlert = false;
    _detourReason = null;
    _detourTimeSavedMinutes = null;
    notifyListeners();
  }

  void acceptDetourRoute() {
    if (_smartRoutes.length > 1) {
      final alt = _smartRoutes.firstWhere(
        (r) => r.id != _selectedSmartRoute?.id,
        orElse: () => _smartRoutes.first,
      );
      selectSmartRoute(alt);
      _navCoordinateIndex = 0;
      _navStepIndex = 0;
      if (alt.steps.isNotEmpty) {
        speakInstruction('Nouvel itinéraire calculé. Évitement activé : ${alt.steps.first.instruction}');
      }
    }
    dismissDetourAlert();
  }

  // WebSocket Status Getters
  WsConnectionStatus get wsStatus => _wsService.status;
  bool get isWsConnected => _wsService.isConnected;

  // City KPI Stats
  double get averageSpeed {
    final nodes = currentNodes;
    if (nodes.isEmpty) return 0.0;
    final total = nodes.fold<double>(0.0, (acc, n) => acc + n.averageSpeedKmh);
    return (total / nodes.length);
  }

  int get totalCriticalBottlenecks {
    return currentNodes.where((n) => n.currentCongestion == CongestionLevel.jammed || n.currentCongestion == CongestionLevel.heavy).length;
  }

  int get activeAlertsCount => currentCityAlerts.length;

  void _initWebSocket() {
    _wsService.connect();
    _wsStatusSub = _wsService.statusStream.listen((status) {
      if (!_isDisposed) notifyListeners();
    });

    _wsMessageSub = _wsService.messageStream.listen((data) {
      if (_isDisposed) return;
      _handleWebSocketMessage(data);
    });
  }

  void _handleWebSocketMessage(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    if (type == null) return;

    switch (type) {
      case 'CITIZEN_REPORT_CREATED':
        final repJson = data['report'];
        if (repJson is Map<String, dynamic>) {
          final rep = CitizenReport.fromJson(repJson);
          if (rep.city == _selectedCity) {
            final exists = _citizenReports.any((r) => r.id == rep.id);
            if (!exists) {
              _citizenReports.insert(0, rep);
              notifyListeners();
            }
          }
        }
        break;

      case 'REPORT_VOTE_UPDATED':
        final repJson = data['report'];
        if (repJson is Map<String, dynamic>) {
          final rep = CitizenReport.fromJson(repJson);
          final idx = _citizenReports.indexWhere((r) => r.id == rep.id);
          if (idx != -1) {
            _citizenReports[idx] = rep;
            notifyListeners();
          }
        }
        break;

      case 'TRAFFIC_NODES_UPDATED':
        final nodesJson = data['nodes'] as List<dynamic>?;
        if (nodesJson != null && nodesJson.isNotEmpty) {
          final updated = nodesJson.map((n) => TrafficNode.fromJson(n as Map<String, dynamic>)).toList();
          if (_selectedCity == 'Yaoundé') {
            _yaoundeNodes = updated;
          } else {
            _doualaNodes = updated;
          }
          notifyListeners();
        }
        break;

      case 'EMERGENCY_MISSION_DISPATCHED':
      case 'EMERGENCY_MISSION_UPDATED':
        final missionJson = data['mission'];
        if (missionJson is Map<String, dynamic>) {
          _activeEmergencyMission = EmergencyMission.fromJson(missionJson);
          _isEmergencyModeActive = true;
          notifyListeners();
        }
        break;

      case 'EMERGENCY_MISSION_ENDED':
        _activeEmergencyMission = null;
        _isEmergencyModeActive = false;
        notifyListeners();
        break;
    }
  }

  void _loadInitialData() {
    _yaoundeNodes = CityData.getYaoundeNodes();
    _doualaNodes = CityData.getDoualaNodes();
    _alerts = CityData.getInitialAlerts();
    _priorityRoutes = CityData.getInitialPriorityRoutes();
    if (_yaoundeNodes.isNotEmpty) {
      _selectedNode = _yaoundeNodes.first;
    }

    _savedPlaces = [
      SavedPlace(
        id: 'sp_1',
        title: 'Domicile (Bastos)',
        address: 'Rue 1748, Quartier Bastos, Yaoundé',
        category: SavedPlaceCategory.home,
        position: const LatLng(3.8928, 11.5122),
        city: 'Yaoundé',
      ),
      SavedPlace(
        id: 'sp_2',
        title: 'Bureau / Travail (Centre-Ville)',
        address: 'Boulevard du 20 Mai, Yaoundé',
        category: SavedPlaceCategory.work,
        position: const LatLng(3.8666, 11.5167),
        city: 'Yaoundé',
      ),
      SavedPlace(
        id: 'sp_3',
        title: 'Lycée Français Dominique Savio',
        address: 'Bonapriso, Douala',
        category: SavedPlaceCategory.school,
        position: const LatLng(4.0325, 9.6978),
        city: 'Douala',
      ),
      SavedPlace(
        id: 'sp_4',
        title: 'Marché Mokolo',
        address: 'Avenue Mokolo, Yaoundé',
        category: SavedPlaceCategory.market,
        position: const LatLng(3.8745, 11.4982),
        city: 'Yaoundé',
      ),
    ];

    _tripHistory = [
      TripHistoryItem(
        id: 'th_1',
        title: 'Carrefour Nlongkak',
        subtitle: 'Yaoundé • Rond-point principal',
        destinationPos: const LatLng(3.8820, 11.5210),
        timestamp: DateTime.now().subtract(const Duration(minutes: 42)),
        category: 'recent_route',
      ),
      TripHistoryItem(
        id: 'th_2',
        title: 'Aéroport International de Douala',
        subtitle: 'Douala • Terminal Principal',
        destinationPos: const LatLng(4.0061, 9.7194),
        timestamp: DateTime.now().subtract(const Duration(hours: 3)),
        category: 'recent_route',
      ),
      TripHistoryItem(
        id: 'th_3',
        title: 'Hôpital Général de Yaoundé',
        subtitle: 'Ngousso, Yaoundé',
        destinationPos: const LatLng(3.8967, 11.5456),
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        category: 'search',
      ),
    ];

    _scheduledTrips = [
      ScheduledTrip(
        id: 'st_1',
        title: 'Réunion Direction Générale',
        originName: 'Bastos (Domicile)',
        originPos: const LatLng(3.8928, 11.5122),
        destinationName: 'Immeuble Rose (Centre Administratif)',
        destinationPos: const LatLng(3.8666, 11.5167),
        targetArrivalTime: const TimeOfDay(hour: 8, minute: 30),
        scheduledDate: DateTime.now(),
        recommendedDepartureTime: DateTime.now().add(const Duration(minutes: 45)),
        estimatedDurationMinutes: 28,
        trafficBufferMinutes: 15,
        isReminderActive: true,
        city: 'Yaoundé',
        aiReasoning: 'Heure de pointe matinale sur l\'Axe Bastos-Warda. Ralentissements prévus au Carrefour Bastos (+15 min). Partez à l\'heure conseillée.',
      ),
      ScheduledTrip(
        id: 'st_2',
        title: 'Vol Douala - Paris CDG',
        originName: 'Bonapriso',
        originPos: const LatLng(4.0325, 9.6978),
        destinationName: 'Aéroport International de Douala',
        destinationPos: const LatLng(4.0061, 9.7194),
        targetArrivalTime: const TimeOfDay(hour: 19, minute: 0),
        scheduledDate: DateTime.now(),
        recommendedDepartureTime: DateTime.now().add(const Duration(hours: 4)),
        estimatedDurationMinutes: 35,
        trafficBufferMinutes: 20,
        isReminderActive: true,
        city: 'Douala',
        aiReasoning: 'Trafic très dense sur l\'Axe Akwa-Aéroport le soir. 20 min de marge de sécurité recommandées par l\'IA.',
      ),
    ];
  }

  /// Détection automatique de la ville par géolocalisation GPS en temps réel
  Future<void> autoDetectUserCity({bool notify = true}) async {
    _isAutoLocating = true;
    _locationStatusMessage = 'Détection de votre position GPS...';
    if (notify && !_isDisposed) notifyListeners();

    final result = await LocationService.detectUserCity();

    if (_isDisposed) return;

    _isAutoLocating = false;
    _isGpsLive = result.isGpsLive;
    _userRealPosition = result.position;

    if (result.isGpsLive) {
      _selectedCity = result.detectedCity;
      _wsService.subscribeCity(_selectedCity);
      _locationStatusMessage = 'Position GPS : ${result.detectedCity} (à ${result.distanceKm.toStringAsFixed(1)} km du centre)';
      final nodes = currentNodes;
      _selectedNode = nodes.isNotEmpty ? nodes.first : null;
      fetchSmartRoutes();
    } else {
      _locationStatusMessage = result.errorMessage ?? 'Position par défaut : $_selectedCity';
    }

    if (!_isDisposed) notifyListeners();
  }

  void selectCity(String city) {
    if (_selectedCity != city) {
      _selectedCity = city;
      _wsService.subscribeCity(city);
      final nodes = currentNodes;
      _selectedNode = nodes.isNotEmpty ? nodes.first : null;
      fetchSmartRoutes();
      notifyListeners();
    }
  }

  // --- ACTIONS ITINÉRAIRES MULTI-CRITÈRES, SEGMENTS YANGO & GUIDAGE VOCAL ---
  Future<void> fetchSmartRoutes({dynamic origin, dynamic destination}) async {
    _isSmartRouteLoading = true;
    _isGpsNavigating = false;
    _isNavAutoSimulating = false;
    _navAutoSimTimer?.cancel();
    _navStepIndex = 0;
    _navCompleted = false;
    if (!_isDisposed) notifyListeners();

    // 1. Déterminer le point de départ : priorité absolue à la position GPS réelle
    dynamic start = origin;
    if (start == null || (start is String && (start.toLowerCase().contains('position') || start.toLowerCase().contains('gps')))) {
      start = _userRealPosition ?? (_selectedCity == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter);
    }

    // 2. Déterminer la destination
    final end = destination ?? (_selectedCity == 'Yaoundé' ? 'Bastos (Ambassades)' : 'Bonanjo (Zone Administrative)');

    final res = await CityFlowMobileApiService.calculateSmartRoutes(
      city: _selectedCity,
      origin: start,
      destination: end,
    );

    if (!_isDisposed) {
      _smartRoutes = (res['routes'] as List<SmartRoute>?) ?? [];
      _multimodalOptions = (res['multimodal'] as List<MultimodalOption>?) ?? [];
      if (_smartRoutes.isNotEmpty) {
        _selectedSmartRoute = _smartRoutes.first;
      }
      _isSmartRouteLoading = false;
      notifyListeners();
    }
  }

  void selectSmartRoute(SmartRoute route) {
    _selectedSmartRoute = route;
    _navStepIndex = 0;
    _navCompleted = false;
    notifyListeners();
  }

  void setActiveTravelMode(String mode) {
    _activeTravelMode = mode;
    notifyListeners();
  }

  void toggleVoiceGuidance() {
    _voiceGuidanceEnabled = !_voiceGuidanceEnabled;
    if (!_voiceGuidanceEnabled) {
      try {
        _flutterTts.stop();
      } catch (_) {}
    }
    notifyListeners();
  }

  Future<void> speakInstruction(String text) async {
    if (!_voiceGuidanceEnabled || text.trim().isEmpty) return;
    try {
      await _flutterTts.stop();
      await _flutterTts.setLanguage('fr-FR');
      await _flutterTts.setSpeechRate(0.5);
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.0);
      await _flutterTts.speak(text);
    } catch (e) {
      debugPrint('TTS guidance error: $e');
    }
  }

  Future<void> startGpsNavigation({bool autoSimulate = false}) async {
    _isGpsNavigating = true;
    _isNavAutoSimulating = autoSimulate;
    _navAutoSimTimer?.cancel();
    _navStepIndex = 0;
    _navCoordinateIndex = 0;
    _navCompleted = false;
    _navSpeedKmh = 0.0; // 0 km/h au départ tant que le conducteur ne se déplace pas réellement

    // Récupération immédiate du point GPS le plus frais
    try {
      final pos = await LocationService.getCurrentPosition();
      if (pos != null) {
        _userRealPosition = LatLng(pos.latitude, pos.longitude);
      }
    } catch (_) {}

    _navUserPosition = _userRealPosition ?? (_selectedSmartRoute?.coordinates.isNotEmpty == true ? _selectedSmartRoute!.coordinates.first : currentCityCenter);

    // Si la position réelle est connue et qu'un itinéraire est sélectionné, s'assurer que le tracé part exactement de la position du conducteur
    if (_userRealPosition != null && _selectedSmartRoute != null && _selectedSmartRoute!.coordinates.isNotEmpty) {
      final distToStart = const Distance().as(LengthUnit.Meter, _userRealPosition!, _selectedSmartRoute!.coordinates.first);
      if (distToStart > 40.0) {
        final dest = _selectedSmartRoute!.coordinates.last;
        final res = await CityFlowMobileApiService.calculateSmartRoutes(
          city: _selectedCity,
          origin: _userRealPosition!,
          destination: dest,
        );
        if (!_isDisposed && res['routes'] != null && (res['routes'] as List<SmartRoute>).isNotEmpty) {
          _smartRoutes = res['routes'] as List<SmartRoute>;
          _selectedSmartRoute = _smartRoutes.first;
        }
      }
    }

    if (_selectedSmartRoute != null && _selectedSmartRoute!.coordinates.length > 1) {
      _navBearing = _calculateBearing(
        _selectedSmartRoute!.coordinates[0],
        _selectedSmartRoute!.coordinates[1],
      );
    }

    if (!_isDisposed) notifyListeners();

    // Annonce vocale de départ
    if (_selectedSmartRoute != null && _selectedSmartRoute!.steps.isNotEmpty) {
      final firstStep = _selectedSmartRoute!.steps.first;
      speakInstruction(firstStep.spokenText.isNotEmpty ? firstStep.spokenText : firstStep.instruction);
    }

    // Écoute flux GPS temps réel du smartphone
    _gpsStreamSub?.cancel();
    try {
      _gpsStreamSub = LocationService.getPositionStream().listen((Position pos) {
        if (!_isDisposed && _isGpsNavigating && !_isNavAutoSimulating) {
          updateRealGpsPosition(
            LatLng(pos.latitude, pos.longitude),
            speedKmh: pos.speed >= 0 ? pos.speed * 3.6 : 0.0,
            heading: pos.heading >= 0 ? pos.heading : null,
          );
        }
      });
    } catch (e) {
      debugPrint('Erreur stream GPS: $e');
    }

    if (autoSimulate) {
      _startNavSimulation();
    }
  }

  void _startNavSimulation() {
    _isNavAutoSimulating = true;
    _navAutoSimTimer?.cancel();

    _navAutoSimTimer = Timer.periodic(const Duration(milliseconds: 1300), (timer) {
      if (!_isGpsNavigating || _navCompleted || _isDisposed) {
        timer.cancel();
        _isNavAutoSimulating = false;
        if (!_isDisposed) notifyListeners();
        return;
      }

      if (_selectedSmartRoute == null || _selectedSmartRoute!.coordinates.isEmpty) return;

      final coords = _selectedSmartRoute!.coordinates;
      if (_navCoordinateIndex < coords.length - 1) {
        final currentPos = coords[_navCoordinateIndex];
        _navCoordinateIndex++;
        final nextPos = coords[_navCoordinateIndex];

        _navUserPosition = nextPos;
        _navBearing = _calculateBearing(currentPos, nextPos);

        // Vitesse dynamique selon l'état de fluidité de la route (Style Yango)
        if (_selectedSmartRoute!.trafficSegments.isNotEmpty) {
          final segIdx = ((_navCoordinateIndex / coords.length) * _selectedSmartRoute!.trafficSegments.length).floor().clamp(0, _selectedSmartRoute!.trafficSegments.length - 1);
          final currentSeg = _selectedSmartRoute!.trafficSegments[segIdx];
          _navSpeedKmh = (currentSeg.speedKmh + (Random().nextInt(6) - 3)).clamp(8.0, 75.0);
        } else {
          _navSpeedKmh = (38 + Random().nextInt(14)).toDouble();
        }

        // Calculer l'étape correspondante au fur et à mesure de l'avancement
        final steps = _selectedSmartRoute!.steps;
        if (steps.isNotEmpty) {
          final targetStepIndex = ((_navCoordinateIndex / coords.length) * steps.length).floor().clamp(0, steps.length - 1);
          if (targetStepIndex != _navStepIndex) {
            _navStepIndex = targetStepIndex;
            final step = steps[_navStepIndex];
            speakInstruction(step.spokenText.isNotEmpty ? step.spokenText : step.instruction);
          }
        }

        // Détection de déviation alternative en milieu de parcours si bouchon
        if (_navCoordinateIndex == 14 && _smartRoutes.length > 1 && !_hasDetourAlert) {
          triggerDetourAlert(
            reason: 'Ralentissement important détecté sur l\'axe principal',
            timeSavedMinutes: 4,
          );
          speakInstruction('Itinéraire alternatif plus rapide trouvé. Gain estimé de 4 minutes.');
        }

        notifyListeners();
      } else {
        _navCompleted = true;
        _navAutoSimTimer?.cancel();
        _isNavAutoSimulating = false;
        speakInstruction('Vous êtes arrivé à votre destination. Merci d\'avoir utilisé CityFlow.');
        notifyListeners();
      }
    });
  }

  void updateRealGpsPosition(LatLng newPos, {double? speedKmh, double? heading}) {
    if (!_isGpsNavigating || _isDisposed) return;

    // Mise à jour du cap (Bearing)
    if (heading != null && heading >= 0 && (speedKmh == null || speedKmh > 2.0)) {
      _navBearing = heading;
    } else if (_navUserPosition != null) {
      final dist = const Distance().as(LengthUnit.Meter, _navUserPosition!, newPos);
      if (dist >= 3.0) {
        _navBearing = _calculateBearing(_navUserPosition!, newPos);
      }
    }

    _userRealPosition = newPos;
    _navUserPosition = newPos;

    // Vitesse réelle en km/h
    if (speedKmh != null) {
      _navSpeedKmh = max(0.0, double.parse(speedKmh.toStringAsFixed(1)));
    }

    if (_selectedSmartRoute == null || _selectedSmartRoute!.coordinates.isEmpty) {
      notifyListeners();
      return;
    }

    final coords = _selectedSmartRoute!.coordinates;
    final steps = _selectedSmartRoute!.steps;

    // Projection de la position réelle sur la route
    double minDistance = double.infinity;
    int closestIdx = _navCoordinateIndex;
    for (int i = 0; i < coords.length; i++) {
      final d = const Distance().as(LengthUnit.Meter, newPos, coords[i]);
      if (d < minDistance) {
        minDistance = d;
        closestIdx = i;
      }
    }
    _navCoordinateIndex = closestIdx;

    // Vérification de l'arrivée à destination (< 30 mètres)
    final destPos = coords.last;
    final distToDest = const Distance().as(LengthUnit.Meter, newPos, destPos);
    if (distToDest <= 30.0 && !_navCompleted) {
      _navCompleted = true;
      speakInstruction('Vous êtes arrivé à votre destination. Merci d\'avoir utilisé CityFlow.');
      notifyListeners();
      return;
    }

    // Progression des étapes au fur et à mesure que le conducteur roule
    if (steps.isNotEmpty && _navStepIndex < steps.length - 1) {
      int targetIdx = _navStepIndex;
      if (targetIdx == 0 && steps.length > 1) {
        targetIdx = 1;
      }
      final targetStep = steps[targetIdx];

      bool shouldAdvance = false;
      if (targetStep.position != null) {
        final distToTarget = const Distance().as(LengthUnit.Meter, newPos, targetStep.position!);
        if (distToTarget <= 35.0) {
          shouldAdvance = true;
        }
      } else {
        final expectedCoordIdx = ((targetIdx / (steps.length - 1)) * (coords.length - 1)).round();
        if (_navCoordinateIndex >= expectedCoordIdx) {
          shouldAdvance = true;
        }
      }

      if (shouldAdvance && _navStepIndex < steps.length - 1) {
        _navStepIndex++;
        final step = steps[_navStepIndex];
        speakInstruction(step.spokenText.isNotEmpty ? step.spokenText : step.instruction);
      }
    }

    notifyListeners();
  }

  double _calculateBearing(LatLng start, LatLng end) {
    final lat1 = start.latitude * (pi / 180.0);
    final lat2 = end.latitude * (pi / 180.0);
    final dLon = (end.longitude - start.longitude) * (pi / 180.0);
    final y = sin(dLon) * cos(lat2);
    final x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
    final rad = atan2(y, x);
    return (rad * 180.0 / pi + 360.0) % 360.0;
  }

  void nextGpsStep() {
    if (_selectedSmartRoute != null && _selectedSmartRoute!.steps.isNotEmpty) {
      if (_navStepIndex < _selectedSmartRoute!.steps.length - 1) {
        _navStepIndex++;
        final step = _selectedSmartRoute!.steps[_navStepIndex];
        speakInstruction(step.spokenText.isNotEmpty ? step.spokenText : step.instruction);
      } else {
        _navCompleted = true;
        speakInstruction('Vous êtes arrivé à votre destination. Merci d\'avoir utilisé CityFlow.');
      }
      notifyListeners();
    }
  }

  void previousGpsStep() {
    if (_selectedSmartRoute != null && _selectedSmartRoute!.steps.isNotEmpty) {
      if (_navStepIndex > 0) {
        _navStepIndex--;
        _navCompleted = false;
        final step = _selectedSmartRoute!.steps[_navStepIndex];
        speakInstruction(step.spokenText.isNotEmpty ? step.spokenText : step.instruction);
        notifyListeners();
      }
    }
  }

  void stopGpsNavigation() {
    _isGpsNavigating = false;
    _isNavAutoSimulating = false;
    _navAutoSimTimer?.cancel();
    _gpsStreamSub?.cancel();
    _navStepIndex = 0;
    _navCoordinateIndex = 0;
    _navCompleted = false;
    try {
      _flutterTts.stop();
    } catch (_) {}
    notifyListeners();
  }

  void toggleNavAutoSimulation() {
    _isNavAutoSimulating = !_isNavAutoSimulating;
    _navAutoSimTimer?.cancel();

    if (_isNavAutoSimulating) {
      _startNavSimulation();
    }

    notifyListeners();
  }

  void selectNode(TrafficNode node) {
    _selectedNode = node;
    notifyListeners();
  }

  void toggleEmergencyMode(bool active, {PriorityRoute? route}) {
    _isEmergencyModeActive = active;
    if (active) {
      _activePriorityRoute = route ?? _priorityRoutes.firstWhere(
        (r) => r.originName.contains(_selectedCity == 'Yaoundé' ? 'Mokolo' : 'Bassa'),
        orElse: () => _priorityRoutes.first,
      );
    } else {
      _activePriorityRoute = null;
    }
    notifyListeners();
  }

  void selectPriorityRoute(PriorityRoute route) {
    _activePriorityRoute = route;
    _isEmergencyModeActive = true;
    notifyListeners();
  }

  void addAlert({
    required String title,
    required String locationDescription,
    required LatLng position,
    required AlertSeverity severity,
    required AlertCategory category,
  }) {
    final newAlert = IncidentAlert(
      id: 'alt_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      city: _selectedCity,
      locationDescription: locationDescription,
      position: position,
      severity: severity,
      category: category,
      reportedAt: DateTime.now(),
      confirmationsCount: 1,
      isVerifiedByAuthority: false,
    );
    _alerts.insert(0, newAlert);
    notifyListeners();
  }

  void markAlertAsRead(String alertId) {
    final index = _alerts.indexWhere((a) => a.id == alertId);
    if (index != -1) {
      _alerts[index] = _alerts[index].copyWith(isRead: true);
      notifyListeners();
    }
  }

  void confirmAlert(String alertId) {
    final index = _alerts.indexWhere((a) => a.id == alertId);
    if (index != -1) {
      _alerts[index] = _alerts[index].copyWith(
        confirmationsCount: _alerts[index].confirmationsCount + 1,
      );
      notifyListeners();
    }
  }

  // --- ACTIONS CROWDSOURCING & GAMIFICATION ---
  Future<void> refreshCitizenData() async {
    try {
      final reports = await CityFlowMobileApiService.fetchCitizenReports(_selectedCity);
      final profile = await CityFlowMobileApiService.fetchCitizenProfile();
      final catalog = await CityFlowMobileApiService.fetchRewardsCatalog();

      if (!_isDisposed) {
        _citizenReports = reports;
        _citizenProfile = profile;
        _rewardsCatalog = catalog;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> createCitizenReport({
    required String title,
    required String locationDescription,
    required CitizenReportCategory category,
    required CitizenReportSeverity severity,
    LatLng? position,
  }) async {
    final pos = position ?? (_selectedNode?.position ?? currentCityCenter);
    final created = await CityFlowMobileApiService.submitCitizenReport(
      title: title,
      city: _selectedCity,
      locationDescription: locationDescription,
      category: category,
      severity: severity,
      position: pos,
    );

    if (created != null) {
      _citizenReports.insert(0, created);
      if (_citizenProfile != null) {
        _citizenProfile = _citizenProfile!.copyWith(
          reputationScore: _citizenProfile!.reputationScore + 15,
          reportsCount: _citizenProfile!.reportsCount + 1,
        );
      }
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> addCitizenReport({
    required String title,
    required String locationDescription,
    required CitizenReportCategory category,
    required CitizenReportSeverity severity,
    LatLng? position,
  }) => createCitizenReport(
    title: title,
    locationDescription: locationDescription,
    category: category,
    severity: severity,
    position: position,
  );

  Future<void> voteReport(String reportId, String voteType) async {
    final updated = await CityFlowMobileApiService.voteCitizenReport(reportId, voteType);
    if (updated != null) {
      final idx = _citizenReports.indexWhere((r) => r.id == reportId);
      if (idx != -1) {
        _citizenReports[idx] = updated;
      }
      if (_citizenProfile != null) {
        _citizenProfile = _citizenProfile!.copyWith(
          confirmationsGiven: _citizenProfile!.confirmationsGiven + 1,
          reputationScore: _citizenProfile!.reputationScore + 2,
        );
      }
      notifyListeners();
    }
  }

  Future<void> voteCitizenReport(String reportId, String voteType) => voteReport(reportId, voteType);

  Future<RewardCoupon?> claimReward(String rewardId) async {
    final coupon = await CityFlowMobileApiService.redeemReward(rewardId);
    if (coupon != null) {
      await refreshCitizenData();
      return coupon;
    }
    return null;
  }

  Future<RewardCoupon?> redeemCatalogReward(String rewardId) => claimReward(rewardId);

  // --- ACTIONS MODE SECOURS (ONDE VERTE) ---
  EmergencyMission? get activeEmergencyMission => _activeEmergencyMission;
  bool get hasActiveEmergencyMission => _activeEmergencyMission != null;

  Future<void> checkEmergencyStatus() async {
    try {
      final mission = await CityFlowMobileApiService.fetchActiveEmergencyMission(_selectedCity);
      if (!_isDisposed) {
        _activeEmergencyMission = mission;
        _isEmergencyModeActive = mission != null;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> dispatchEmergency({
    required String vehicleType,
    String? corridorId,
    String? origin,
    String? destination,
  }) async {
    final mission = await CityFlowMobileApiService.dispatchEmergencyMission(
      vehicleType: vehicleType,
      city: _selectedCity,
      corridorId: corridorId,
      origin: origin,
      destination: destination,
    );

    if (mission != null) {
      _activeEmergencyMission = mission;
      _isEmergencyModeActive = true;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> stepEmergency() async {
    final updated = await CityFlowMobileApiService.stepEmergencyMission();
    _activeEmergencyMission = updated;
    _isEmergencyModeActive = updated != null;
    notifyListeners();
  }

  Future<void> cancelEmergency() async {
    await CityFlowMobileApiService.cancelEmergencyMission();
    _activeEmergencyMission = null;
    _isEmergencyModeActive = false;
    notifyListeners();
  }

  void toggleLiveSimulation() {
    _isLiveSimulating = !_isLiveSimulating;
    if (_isLiveSimulating) {
      _startLiveSimulation();
    } else {
      _simulationTimer?.cancel();
    }
    notifyListeners();
  }

  void _startLiveSimulation() {
    _simulationTimer?.cancel();
    _simulationTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!_isLiveSimulating || _isDisposed) return;

      try {
        final apiNodes = await CityFlowMobileApiService.fetchTrafficNodes(_selectedCity);
        if (!_isDisposed && apiNodes.isNotEmpty) {
          if (_selectedCity == 'Yaoundé') {
            _yaoundeNodes = apiNodes;
          } else {
            _doualaNodes = apiNodes;
          }
        }
      } catch (_) {}

      final random = Random();
      
      void updateNodeList(List<TrafficNode> list, Function(List<TrafficNode>) setter) {
        final updated = list.map((n) {
          final speedDelta = (random.nextDouble() * 3.0) - 1.5;
          final newSpeed = (n.averageSpeedKmh + speedDelta).clamp(4.0, 55.0);
          final roundedSpeed = double.parse(newSpeed.toStringAsFixed(1));

          CongestionLevel newLevel;
          int delay;
          if (roundedSpeed < 10.0) {
            newLevel = CongestionLevel.jammed;
            delay = (30 + random.nextInt(15));
          } else if (roundedSpeed < 20.0) {
            newLevel = CongestionLevel.heavy;
            delay = (15 + random.nextInt(15));
          } else if (roundedSpeed < 35.0) {
            newLevel = CongestionLevel.moderate;
            delay = (5 + random.nextInt(10));
          } else {
            newLevel = CongestionLevel.fluid;
            delay = (1 + random.nextInt(4));
          }

          final vehicles = (n.vehicleCountPerHour + random.nextInt(50) - 25).clamp(400, 6500);

          return n.copyWith(
            averageSpeedKmh: roundedSpeed,
            currentCongestion: newLevel,
            estimatedDelayMinutes: delay,
            vehicleCountPerHour: vehicles,
          );
        }).toList();

        setter(updated);
      }

      updateNodeList(_yaoundeNodes, (l) => _yaoundeNodes = l);
      updateNodeList(_doualaNodes, (l) => _doualaNodes = l);

      if (_selectedNode != null) {
        final currentList = currentNodes;
        _selectedNode = currentList.firstWhere(
          (n) => n.id == _selectedNode!.id,
          orElse: () => _selectedNode!,
        );
      }

      if (!_isDisposed) {
        notifyListeners();
      }
    });
  }

  // --- GESTION DES LIEUX ENREGISTRÉS ---
  List<SavedPlace> get savedPlaces => _savedPlaces;
  List<SavedPlace> get currentCitySavedPlaces => _savedPlaces.where((p) => p.city == _selectedCity).toList();

  void addSavedPlace(SavedPlace place) {
    _savedPlaces.add(place);
    notifyListeners();
  }

  void removeSavedPlace(String id) {
    _savedPlaces.removeWhere((p) => p.id == id);
    notifyListeners();
  }

  void updateSavedPlace(SavedPlace place) {
    final idx = _savedPlaces.indexWhere((p) => p.id == place.id);
    if (idx != -1) {
      _savedPlaces[idx] = place;
      notifyListeners();
    }
  }

  // --- PLANIFICATEUR IA DE DÉPART (TRIP PLANNER) ---
  List<ScheduledTrip> get scheduledTrips => _scheduledTrips;
  List<ScheduledTrip> get currentCityScheduledTrips => _scheduledTrips.where((t) => t.city == _selectedCity).toList();

  ScheduledTrip planTripWithAi({
    required String title,
    required String originName,
    required LatLng originPos,
    required String destinationName,
    required LatLng destinationPos,
    required TimeOfDay targetArrivalTime,
    required DateTime date,
  }) {
    // Calcul distance approximative
    final dLat = (destinationPos.latitude - originPos.latitude).abs() * 111.0;
    final dLng = (destinationPos.longitude - originPos.longitude).abs() * 111.0;
    final distKm = sqrt(dLat * dLat + dLng * dLng);

    // Analyse IA de la congestion selon l'heure cible
    final hour = targetArrivalTime.hour;
    final isMorningPeak = hour >= 7 && hour <= 9;
    final isEveningPeak = hour >= 17 && hour <= 20;

    int baseDuration = max(10, (distKm * 2.8).round());
    int bufferMinutes = 8;
    String reasoning = 'Trafic estimé fluide. Marge de sécurité normale (+8 min).';

    if (isMorningPeak) {
      bufferMinutes = 20;
      baseDuration = (baseDuration * 1.45).round();
      reasoning = 'Heure de pointe matinale intense sur Yaoundé/Douala. Embouteillages probables sur les axes structurants (+20 min buffer IA).';
    } else if (isEveningPeak) {
      bufferMinutes = 25;
      baseDuration = (baseDuration * 1.6).round();
      reasoning = 'Pointe vespérale et sorties de bureaux. Ralentissements carrefours majeurs (+25 min buffer IA).';
    }

    final totalLeadMinutes = baseDuration + bufferMinutes;
    final arrivalDateTime = DateTime(
      date.year,
      date.month,
      date.day,
      targetArrivalTime.hour,
      targetArrivalTime.minute,
    );
    final recommendedDeparture = arrivalDateTime.subtract(Duration(minutes: totalLeadMinutes));

    final newTrip = ScheduledTrip(
      id: 'st_${DateTime.now().millisecondsSinceEpoch}',
      title: title.isNotEmpty ? title : 'Trajet vers $destinationName',
      originName: originName,
      originPos: originPos,
      destinationName: destinationName,
      destinationPos: destinationPos,
      targetArrivalTime: targetArrivalTime,
      scheduledDate: date,
      recommendedDepartureTime: recommendedDeparture,
      estimatedDurationMinutes: baseDuration,
      trafficBufferMinutes: bufferMinutes,
      isReminderActive: true,
      city: _selectedCity,
      aiReasoning: reasoning,
    );

    _scheduledTrips.insert(0, newTrip);
    notifyListeners();
    return newTrip;
  }

  void toggleScheduledTripReminder(String id) {
    final idx = _scheduledTrips.indexWhere((t) => t.id == id);
    if (idx != -1) {
      final cur = _scheduledTrips[idx];
      _scheduledTrips[idx] = cur.copyWith(isReminderActive: !cur.isReminderActive);
      notifyListeners();
    }
  }

  void removeScheduledTrip(String id) {
    _scheduledTrips.removeWhere((t) => t.id == id);
    notifyListeners();
  }

  // --- HISTORIQUE DES TRAJETS & RECHERCHES ---
  List<TripHistoryItem> get tripHistory => _tripHistory;

  void addToTripHistory({
    required String title,
    required String subtitle,
    required LatLng destinationPos,
    String category = 'recent_route',
  }) {
    _tripHistory.removeWhere((h) => h.title.toLowerCase() == title.toLowerCase());
    _tripHistory.insert(
      0,
      TripHistoryItem(
        id: 'th_${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        subtitle: subtitle,
        destinationPos: destinationPos,
        timestamp: DateTime.now(),
        category: category,
      ),
    );
    if (_tripHistory.length > 25) {
      _tripHistory = _tripHistory.sublist(0, 25);
    }
    notifyListeners();
  }

  void removeTripHistoryItem(String id) {
    _tripHistory.removeWhere((h) => h.id == id);
    notifyListeners();
  }

  void clearTripHistory() {
    _tripHistory.clear();
    notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    _simulationTimer?.cancel();
    _navAutoSimTimer?.cancel();
    _gpsStreamSub?.cancel();
    try {
      _flutterTts.stop();
    } catch (_) {}
    _wsStatusSub?.cancel();
    _wsMessageSub?.cancel();
    _wsService.disconnect();
    super.dispose();
  }
}
