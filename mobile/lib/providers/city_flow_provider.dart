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
import '../models/route_incident_notification.dart';

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
  List<CommunityRadioMessage> _radioMessages = [];
  List<SosAssistanceRequest> _sosRequests = [];

  // ★ Notifications géo-contextuelles sur trajet
  final List<RouteIncidentNotification> _routeAlerts = [];

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
  bool _shouldShowRouteOverview = false;
  String? _targetDestinationName;
  String? _targetOriginName;
  int _navStepIndex = 0;
  int _navCoordinateIndex = 0;
  LatLng? _navUserPosition;
  double _navBearing = 0.0;
  double _navSpeedKmh = 38.0;
  bool _navCompleted = false;
  StreamSubscription? _gpsStreamSub;

  bool get shouldShowRouteOverview => _shouldShowRouteOverview;
  String? get targetDestinationName => _targetDestinationName;
  String? get targetOriginName => _targetOriginName;

  void triggerRouteOverview({String? originName, String? destinationName}) {
    _shouldShowRouteOverview = true;
    if (destinationName != null) _targetDestinationName = destinationName;
    if (originName != null) _targetOriginName = originName;
    if (!_isDisposed) notifyListeners();
  }

  void clearRouteOverviewTrigger() {
    _shouldShowRouteOverview = false;
  }

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

  // Détection Hors-Itinéraire & Recalcul Dynamique en Temps Réel
  bool _isOffRoute = false;
  double _distanceToRouteMeters = 0.0;
  List<SmartRoute> _offRouteAlternatives = [];
  bool _isRecalculatingOffRoute = false;
  bool _autoRerouteEnabled = true;
  DateTime? _lastOffRouteSpokenTime;
  DateTime? _lastOffRouteRecalcTime;
  LatLng? _lastOffRouteRecalcPos;
  int _offRouteConsecutiveDetections = 0;

  TrafficNode? _selectedNode;
  PriorityRoute? _activePriorityRoute;
  bool _isEmergencyModeActive = false;
  bool _isLiveSimulating = true;
  Timer? _simulationTimer;
  Timer? _emergencyTicker;

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
  List<CommunityRadioMessage> get currentCityRadioMessages =>
      _radioMessages.where((m) => m.city.toLowerCase() == _selectedCity.toLowerCase()).toList();
  List<SosAssistanceRequest> get currentCitySosRequests =>
      _sosRequests.where((s) => s.city.toLowerCase() == _selectedCity.toLowerCase()).toList();

  // Notifications géo-contextuelles sur trajet
  List<RouteIncidentNotification> get routeAlerts =>
      _routeAlerts.where((a) => !a.isDismissed).toList();
  bool get hasActiveRouteAlerts => _routeAlerts.any((a) => !a.isDismissed);

  void dismissRouteAlert(String alertId) {
    final idx = _routeAlerts.indexWhere((a) => a.id == alertId);
    if (idx != -1) {
      _routeAlerts[idx].isDismissed = true;
      if (!_isDisposed) notifyListeners();
    }
  }

  void clearAllRouteAlerts() {
    for (final a in _routeAlerts) {
      a.isDismissed = true;
    }
    if (!_isDisposed) notifyListeners();
  }

  
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

  // Off-Route (Hors itinéraire) Getters & Handlers
  bool get isOffRoute => _isOffRoute;
  double get distanceToRouteMeters => _distanceToRouteMeters;
  List<SmartRoute> get offRouteAlternatives => _offRouteAlternatives;
  bool get isRecalculatingOffRoute => _isRecalculatingOffRoute;
  bool get autoRerouteEnabled => _autoRerouteEnabled;

  void toggleAutoReroute([bool? enable]) {
    _autoRerouteEnabled = enable ?? !_autoRerouteEnabled;
    notifyListeners();
  }

  void dismissOffRouteAlert() {
    _isOffRoute = false;
    _offRouteAlternatives.clear();
    _offRouteConsecutiveDetections = 0;
    notifyListeners();
  }

  Future<void> recalculateOffRouteRoutes({LatLng? fromPosition, bool force = false}) async {
    if (_selectedSmartRoute == null || _selectedSmartRoute!.coordinates.isEmpty) return;
    if (_isRecalculatingOffRoute && !force) return;

    final origin = fromPosition ?? _userRealPosition ?? _navUserPosition ?? currentCityCenter;
    final destination = _selectedSmartRoute!.coordinates.last;

    _isRecalculatingOffRoute = true;
    _lastOffRouteRecalcTime = DateTime.now();
    _lastOffRouteRecalcPos = origin;
    notifyListeners();

    try {
      final res = await CityFlowMobileApiService.calculateSmartRoutes(
        city: _selectedCity,
        origin: origin,
        destination: destination,
      );

      if (!_isDisposed && res['routes'] != null) {
        final List<SmartRoute> routes = (res['routes'] as List<SmartRoute>)
            .where((r) => r.coordinates.isNotEmpty)
            .toList();

        if (routes.isNotEmpty) {
          _offRouteAlternatives = routes;
        }
      }
    } catch (e) {
      debugPrint('Off-route recalculation error: $e');
    } finally {
      if (!_isDisposed) {
        _isRecalculatingOffRoute = false;
        notifyListeners();
      }
    }
  }

  void acceptAlternativeRoute(SmartRoute route) {
    _selectedSmartRoute = route;
    if (!_smartRoutes.any((r) => r.id == route.id)) {
      _smartRoutes = [route, ..._smartRoutes];
    }
    _isOffRoute = false;
    _offRouteAlternatives.clear();
    _offRouteConsecutiveDetections = 0;
    _distanceToRouteMeters = 0.0;
    _navCoordinateIndex = 0;
    _navStepIndex = 0;
    if (route.coordinates.isNotEmpty) {
      _navUserPosition = route.coordinates.first;
    }

    if (route.steps.isNotEmpty) {
      final firstStep = route.steps.first;
      speakInstruction('Nouvel itinéraire appliqué. ${firstStep.spokenText.isNotEmpty ? firstStep.spokenText : firstStep.instruction}');
    } else {
      speakInstruction('Nouvel itinéraire calculé avec succès.');
    }
    notifyListeners();
  }

  void simulateOffRouteDeviation() {
    if (!_isGpsNavigating || _selectedSmartRoute == null || _selectedSmartRoute!.coordinates.isEmpty) return;
    final currentPos = _navUserPosition ?? _selectedSmartRoute!.coordinates.first;
    // Décaler artificiellement de ~120 mètres
    final deviatedPos = LatLng(currentPos.latitude + 0.0011, currentPos.longitude - 0.0012);
    updateRealGpsPosition(deviatedPos, speedKmh: 32.0);
  }

  // WebSocket Status Getters
  WsConnectionStatus get wsStatus => _wsService.status;
  bool get isWsConnected => _wsService.isConnected;

  // ===================================================================
  // PROFIL UTILISATEUR & AUTHENTIFICATION OTP STYLE YANGO
  // ===================================================================
  bool _isAuthenticated = false;
  bool _isGuestMode = false;
  bool _hasEnteredApp = false;
  String _userName = '';
  String _userPhone = '';
  String _userAddress = '';
  String _userEmail = '';
  String? _authToken;

  bool get isAuthenticated => _isAuthenticated;
  bool get isGuestMode => _isGuestMode;
  bool get hasEnteredApp => _hasEnteredApp;
  bool get hasAccess => _hasEnteredApp && (_isAuthenticated || _isGuestMode);
  String get userName => _userName.isNotEmpty ? _userName : (_isGuestMode ? 'Conducteur Invité' : 'Conducteur CityFlow');
  String get userPhone => _userPhone.isNotEmpty ? _userPhone : '+237 699 12 34 56';
  String get userAddress => _userAddress.isNotEmpty ? _userAddress : 'Bastos, Yaoundé';
  String get userEmail => _userEmail;
  String? get authToken => _authToken;

  void continueAsGuest() {
    _isGuestMode = true;
    _isAuthenticated = false;
    _hasEnteredApp = true;
    _userName = 'Conducteur Invité';
    _userPhone = '+237 6-- -- -- --';
    _userAddress = 'Yaoundé & Douala';
    notifyListeners();
  }

  void enterApp() {
    _hasEnteredApp = true;
    notifyListeners();
  }

  void updateUserProfile({
    required String name,
    required String phone,
    required String address,
    required String city,
    String? email,
  }) {
    _userName = name.trim();
    _userPhone = phone.trim();
    _userAddress = address.trim();
    _selectedCity = city;
    if (email != null && email.isNotEmpty) _userEmail = email.trim();
    _isAuthenticated = true;
    _hasEnteredApp = true;
    notifyListeners();
  }

  void logout() {
    _isAuthenticated = false;
    _isGuestMode = false;
    _hasEnteredApp = false;
    _authToken = null;
    notifyListeners();
  }

  Future<Map<String, dynamic>> sendAuthOtp({
    required String phone,
    required String name,
    required String address,
    required String city,
    String channel = 'sms',
  }) async {
    return await CityFlowMobileApiService.sendAuthOtp(
      phone: phone,
      name: name,
      address: address,
      city: city,
      channel: channel,
    );
  }

  Future<Map<String, dynamic>> verifyAuthOtp({
    required String phone,
    required String code,
    required String name,
    required String address,
    required String city,
    String channel = 'sms',
  }) async {
    final result = await CityFlowMobileApiService.verifyAuthOtp(
      phone: phone,
      code: code,
      name: name,
      address: address,
      city: city,
      channel: channel,
    );

    if (result['success'] == true) {
      final user = result['user'] as Map<String, dynamic>?;
      if (user != null) {
        _userName = (user['name'] as String?)?.trim() ?? name;
        _userPhone = (user['phone'] as String?)?.trim() ?? phone;
        _userAddress = (user['address'] as String?)?.trim() ?? address;
        _selectedCity = (user['city'] as String?)?.trim() ?? city;
        if (user['email'] != null) _userEmail = user['email'];
      }
      _authToken = result['token'];
      _isAuthenticated = true;
      notifyListeners();
    }

    return result;
  }

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

      case 'RADIO_MESSAGE_CREATED':
        final msgJson = data['radioMsg'];
        if (msgJson is Map<String, dynamic>) {
          final msg = CommunityRadioMessage.fromJson(msgJson);
          if (msg.city.toLowerCase() == _selectedCity.toLowerCase()) {
            final exists = _radioMessages.any((m) => m.id == msg.id);
            if (!exists) {
              _radioMessages.insert(0, msg);
              notifyListeners();
            }
          }
        }
        break;

      case 'SOS_ALERT_CREATED':
        final sosJson = data['sos'];
        if (sosJson is Map<String, dynamic>) {
          final sos = SosAssistanceRequest.fromJson(sosJson);
          if (sos.city.toLowerCase() == _selectedCity.toLowerCase()) {
            final exists = _sosRequests.any((s) => s.id == sos.id);
            if (!exists) {
              _sosRequests.insert(0, sos);
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

      // ★ Alerte incidente géo-contextuelle sur trajet actif
      case 'ROUTE_INCIDENT_ALERT':
        final alertJson = data['alert'];
        if (alertJson is Map<String, dynamic>) {
          final notification = RouteIncidentNotification.fromWsAlert(alertJson);
          // Anti-doublon : ne pas ré-ajouter si le même rapport est déjà actif
          final alreadyExists = _routeAlerts.any(
            (a) => a.reportId == notification.reportId && !a.isDismissed,
          );
          if (!alreadyExists) {
            _routeAlerts.insert(0, notification);
            notifyListeners();
            debugPrint(
              '🚨 [Provider] Alerte trajet reçue : "${notification.title}" à ${notification.distanceMeters}m',
            );
          }
        }
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
  Future<void> fetchSmartRoutes({
    dynamic origin,
    dynamic destination,
    String? originName,
    String? destinationName,
    bool showOverview = false,
  }) async {
    _isSmartRouteLoading = true;
    _isGpsNavigating = false;
    _isNavAutoSimulating = false;
    _navAutoSimTimer?.cancel();
    _navStepIndex = 0;
    _navCompleted = false;
    if (showOverview) {
      _shouldShowRouteOverview = true;
      if (destinationName != null) _targetDestinationName = destinationName;
      if (originName != null) _targetOriginName = originName;
    }
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

    // ★ Enregistrer la route active sur le serveur WS pour les alertes géo-contextuelles
    if (_selectedSmartRoute != null && _selectedSmartRoute!.coordinates.length >= 2) {
      _wsService.registerActiveRoute(
        routePoints: _selectedSmartRoute!.coordinates,
        city: _selectedCity,
      );
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
    _distanceToRouteMeters = minDistance;

    // Vérification de l'arrivée à destination (< 30 mètres)
    final destPos = coords.last;
    final distToDest = const Distance().as(LengthUnit.Meter, newPos, destPos);
    if (distToDest <= 30.0 && !_navCompleted) {
      _navCompleted = true;
      _isOffRoute = false;
      _offRouteAlternatives.clear();
      _offRouteConsecutiveDetections = 0;
      speakInstruction('Vous êtes arrivé à votre destination. Merci d\'avoir utilisé CityFlow.');
      notifyListeners();
      return;
    }

    // Gestion intelligente de la détection Hors-Itinéraire (> 55 mètres)
    if (minDistance > 55.0 && distToDest > 50.0) {
      _offRouteConsecutiveDetections++;
      if (_offRouteConsecutiveDetections >= 2 || minDistance > 80.0) {
        _isOffRoute = true;

        // Rappel vocal régulier avec cooldown de sécurité (14s)
        final now = DateTime.now();
        if (_lastOffRouteSpokenTime == null || now.difference(_lastOffRouteSpokenTime!).inSeconds >= 14) {
          _lastOffRouteSpokenTime = now;
          speakInstruction('Attention, vous avez quitté l\'itinéraire prévu. Recherche de nouveaux itinéraires depuis votre position.');
        }

        // Recalcul automatique et dynamique au fur et à mesure que le conducteur roule
        final shouldRecalc = _lastOffRouteRecalcPos == null ||
            _lastOffRouteRecalcTime == null ||
            const Distance().as(LengthUnit.Meter, newPos, _lastOffRouteRecalcPos!) >= 25.0 ||
            now.difference(_lastOffRouteRecalcTime!).inSeconds >= 6;

        if (shouldRecalc && !_isRecalculatingOffRoute) {
          recalculateOffRouteRoutes(fromPosition: newPos);
        }
      }
    } else if (minDistance <= 30.0) {
      // Retour sur la trajectoire nominale
      _offRouteConsecutiveDetections = 0;
      if (_isOffRoute) {
        _isOffRoute = false;
        _offRouteAlternatives.clear();
        speakInstruction('Vous êtes de retour sur l\'itinéraire.');
      }
      _navCoordinateIndex = closestIdx;
    } else {
      _navCoordinateIndex = closestIdx;
    }

    // Progression des étapes au fur et à mesure que le conducteur roule
    if (!_isOffRoute && steps.isNotEmpty && _navStepIndex < steps.length - 1) {
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
    _isOffRoute = false;
    _offRouteAlternatives.clear();
    _offRouteConsecutiveDetections = 0;
    _distanceToRouteMeters = 0.0;
    _isRecalculatingOffRoute = false;
    try {
      _flutterTts.stop();
    } catch (_) {}

    // ★ Désenregistrer la route active — plus d'alertes géo-contextuelles
    _wsService.unregisterRoute();

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
      final radio = await CityFlowMobileApiService.fetchRadioMessages(_selectedCity);
      final sos = await CityFlowMobileApiService.fetchSosRequests(_selectedCity);

      if (!_isDisposed) {
        _citizenReports = reports;
        _citizenProfile = profile;
        _rewardsCatalog = catalog;
        _radioMessages = radio;
        _sosRequests = sos;
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

  // --- CANAL RADIO-TRAFIC ACTIONS ---
  Future<bool> postRadioMessage({
    required String crossroad,
    required String message,
    bool isAudio = false,
    int audioDurationSeconds = 0,
  }) async {
    final created = await CityFlowMobileApiService.postRadioMessage(
      city: _selectedCity,
      crossroad: crossroad,
      message: message,
      isAudio: isAudio,
      audioDurationSeconds: audioDurationSeconds,
    );

    if (created != null) {
      _radioMessages.insert(0, created);
      if (_citizenProfile != null) {
        _citizenProfile = _citizenProfile!.copyWith(
          reputationScore: _citizenProfile!.reputationScore + 5,
        );
      }
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> likeRadioMessage(String messageId) async {
    final idx = _radioMessages.indexWhere((m) => m.id == messageId);
    if (idx != -1) {
      final msg = _radioMessages[idx];
      _radioMessages[idx] = msg.copyWith(
        likesCount: msg.likesCount + 1,
        isLikedByMe: true,
      );
      notifyListeners();
    }
    await CityFlowMobileApiService.likeRadioMessage(messageId);
  }

  // --- SOS DÉPANNAGE ACTIONS ---
  Future<bool> createSosRequest({
    required String crossroad,
    required String sosType,
    required String details,
    String? phone,
  }) async {
    final created = await CityFlowMobileApiService.submitSosRequest(
      city: _selectedCity,
      crossroad: crossroad,
      sosType: sosType,
      details: details,
      phone: phone,
    );

    if (created != null) {
      _sosRequests.insert(0, created);
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> respondToSosRequest(String sosId) async {
    final ok = await CityFlowMobileApiService.respondToSosRequest(sosId);
    if (ok) {
      final idx = _sosRequests.indexWhere((s) => s.id == sosId);
      if (idx != -1) {
        _sosRequests[idx] = _sosRequests[idx].copyWith(
          status: 'assisted',
          helperName: '${_citizenProfile?.userName ?? "Moi"} (En route)',
        );
      }
      if (_citizenProfile != null) {
        _citizenProfile = _citizenProfile!.copyWith(
          reputationScore: _citizenProfile!.reputationScore + 25,
        );
      }
      notifyListeners();
      return true;
    }
    return false;
  }

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
        if (mission != null && (_emergencyTicker == null || !_emergencyTicker!.isActive)) {
          _startEmergencySimulation();
        }
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
      _startEmergencySimulation();
      notifyListeners();
      return true;
    }
    return false;
  }

  void _startEmergencySimulation() {
    _emergencyTicker?.cancel();
    _emergencyTicker = Timer.periodic(const Duration(seconds: 4), (timer) async {
      if (!_isEmergencyModeActive || _isDisposed || _activeEmergencyMission == null) {
        timer.cancel();
        return;
      }
      final updated = await CityFlowMobileApiService.stepEmergencyMission();
      if (!_isDisposed) {
        _activeEmergencyMission = updated;
        if (updated == null) {
          _isEmergencyModeActive = false;
          timer.cancel();
        }
        notifyListeners();
      }
    });
  }

  Future<void> stepEmergency() async {
    final updated = await CityFlowMobileApiService.stepEmergencyMission();
    _activeEmergencyMission = updated;
    _isEmergencyModeActive = updated != null;
    if (updated == null) {
      _emergencyTicker?.cancel();
    }
    notifyListeners();
  }

  Future<void> cancelEmergency() async {
    _emergencyTicker?.cancel();
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
    TimeOfDay? targetTime,
    TimeOfDay? targetArrivalTime,
    required DateTime date,
    bool isDepartureMode = false,
    String weather = 'auto',
    List<String>? activeEvents,
  }) {
    final effectiveTime = targetTime ?? targetArrivalTime ?? const TimeOfDay(hour: 8, minute: 30);

    // 1. Calcul distance et durée nominale
    final dLat = (destinationPos.latitude - originPos.latitude).abs() * 111.0;
    final dLng = (destinationPos.longitude - originPos.longitude).abs() * 111.0;
    final distKm = sqrt(dLat * dLat + dLng * dLng);
    final nominalDuration = max(10, (distKm * 2.6).round());

    // 2. Analyse temporelle (Heure & Jour)
    final hour = effectiveTime.hour;
    final minute = effectiveTime.minute;
    final hDouble = hour + (minute / 60.0);
    final weekday = date.weekday; // 1 = Lundi, 5 = Vendredi, 6 = Samedi, 7 = Dimanche

    final isMorningPeak = hDouble >= 6.75 && hDouble <= 9.25;
    final isMiddayPeak = hDouble >= 11.75 && hDouble <= 14.0;
    final isEveningPeak = hDouble >= 15.75 && hDouble <= 19.5;
    final isNight = hDouble >= 22.0 || hDouble < 5.5;
    final isFridayFuneralPeak = (weekday == DateTime.friday && (hDouble >= 11.5 && hDouble <= 19.0)) ||
        (weekday == DateTime.saturday && (hDouble >= 7.0 && hDouble <= 13.5));

    // 3. Détection des carrefours et points chauds traversés
    final fullPath = '${originName.toLowerCase()} ${destinationName.toLowerCase()}';
    final isDestCradat = fullPath.contains('cradat') || fullPath.contains('ngoa') || fullPath.contains('chuy');
    final isDestMokolo = fullPath.contains('mokolo') || fullPath.contains('mboppi') || fullPath.contains('marche');
    final isDestNlongkak = fullPath.contains('nlongkak') || fullPath.contains('bastos') || fullPath.contains('omnisport');
    final isDestNdokoti = fullPath.contains('ndokoti') || fullPath.contains('bassa') || fullPath.contains('village');
    final isDestDeido = fullPath.contains('deido') || fullPath.contains('bonaberi') || fullPath.contains('wouri');
    final isDestPosteCentrale = fullPath.contains('poste') || fullPath.contains('centrale') || fullPath.contains('akwa') || fullPath.contains('bonanjo');

    int congestionPct = 25;
    int bufferMinutes = isMorningPeak ? 20 : (isEveningPeak ? 25 : 8);
    final factors = <String>[];
    final warnings = <String>[];

    // Impact heure
    if (isEveningPeak) {
      congestionPct += 42;
      factors.add('🏢 Pic vespéral & sorties bureaux (+25 min)');
      warnings.add('Forte affluence à $hour h : saturation progressive des grands axes sortants.');
    } else if (isMorningPeak) {
      congestionPct += 38;
      factors.add('🎒 Pic matinal (écoles & administrations) (+20 min)');
      warnings.add('Trafic scolaire et pendulaire dense vers les centres-villes.');
    } else if (isMiddayPeak) {
      congestionPct += 18;
      bufferMinutes += 4;
      factors.add('🍽️ Déplacements de mi-journée (+12 min)');
    } else if (isNight) {
      congestionPct = max(10, congestionPct - 15);
      bufferMinutes = max(0, bufferMinutes - 4);
      factors.add('🌙 Trafic nocturne fluide');
    }

    // Impact carrefours spécifiques
    if (isDestCradat) {
      congestionPct += (isEveningPeak ? 26 : 14);
      factors.add('🎓 Goulet d\'étranglement Carrefour CRADAT');
      warnings.add('Carrefour CRADAT : forte concentration de taxis et flux étudiants.');
    }
    if (isDestMokolo) {
      congestionPct += 24;
      factors.add('🛒 Affluence Marché Mokolo / Mboppi');
      warnings.add('Zone commerciale dense : stationnements anarchiques et ralentissements.');
    }
    if (isDestNdokoti) {
      congestionPct += 28;
      factors.add('🚛 Rond-point Ndokoti (Motos & Poids-lourds)');
      warnings.add('Rond-point Ndokoti : nœud critique de congestion grumiers / motos.');
    }
    if (isDestNlongkak) {
      congestionPct += 18;
      factors.add('🚦 Carrefour Nlongkak');
    }
    if (isDestDeido) {
      congestionPct += 20;
      factors.add('🌉 Carrefour Deido / Accès Pont');
    }
    if (isDestPosteCentrale) {
      congestionPct += 15;
      factors.add('🏛️ Cœur urbain & Poste Centrale');
    }

    // Impact météo
    if (weather == 'heavy_rain' || weather == 'flood') {
      congestionPct += 30;
      bufferMinutes += 16;
      factors.add('🌧️ Pluie torrentielle / Risque inondation bas-fonds (+16 min)');
      warnings.add('Alerte Météo : fortes pluies, chaussée inondée et visibilité très réduite.');
    } else if (weather == 'light_rain') {
      congestionPct += 14;
      bufferMinutes += 6;
      factors.add('🌦️ Chaussée glissante (+6 min)');
      warnings.add('Averse modérée : ralentissement réflexe de sécurité.');
    }

    // Événements actifs
    if (activeEvents != null && (activeEvents.contains('funeral_cortege') || isFridayFuneralPeak)) {
      congestionPct += 18;
      bufferMinutes += 12;
      factors.add('⚰️ Cortèges de deuil & levées de corps (+12 min)');
      warnings.add('Ralentissements dus aux cortèges et bâches de deuil sur la chaussée.');
    }
    if (activeEvents != null && activeEvents.contains('police_checkpoint')) {
      congestionPct += 12;
      bufferMinutes += 6;
      factors.add('👮 Contrôle Police & régulation (+6 min)');
      warnings.add('Régulation manuelle et contrôles visibles signalés sur l\'axe.');
    }
    if (activeEvents != null && activeEvents.contains('roadworks')) {
      congestionPct += 16;
      bufferMinutes += 8;
      factors.add('🚧 Travaux de voirie (+8 min)');
      warnings.add('Chantier / voie rétrécie en cours sur l\'axe.');
    }

    final delayMinutes = bufferMinutes;

    // Calcul du statut de la route
    congestionPct = min(98, max(12, congestionPct));
    String roadStatus = 'FLUID';
    String roadStatusLabel = 'Voie fluide et dégagée';
    int speedKmh = 48;

    if (congestionPct >= 80) {
      roadStatus = 'BLOCKED_OR_JAMMED';
      roadStatusLabel = 'Route saturée / Risque d\'axe bloqué';
      speedKmh = 12;
    } else if (congestionPct >= 60) {
      roadStatus = 'HEAVY_CONGESTION';
      roadStatusLabel = 'Forts ralentissements & engorgement';
      speedKmh = 18;
    } else if (congestionPct >= 35) {
      roadStatus = 'MODERATE';
      roadStatusLabel = 'Circulation modérée / Ralentissements';
      speedKmh = 28;
    }

    // Conseil de déviation personnalisé
    String? detourAdvice;
    if (isDestCradat && congestionPct >= 60) {
      detourAdvice = 'Déviation conseillée : Passer par Ngoa-Ekellé (Haut Plateau / CHU) ou Bastos pour éviter l\'entonnoir du Carrefour CRADAT.';
    } else if (isDestMokolo && congestionPct >= 60) {
      detourAdvice = 'Déviation conseillée : Emprunter le Boulevard Jean-Paul II ou le délestage par Madagascar.';
    } else if (isDestNdokoti && congestionPct >= 60) {
      detourAdvice = 'Déviation conseillée : Contourner par Bassa Zone Industrielle ou la pénétrante Est.';
    } else if (isDestDeido && congestionPct >= 60) {
      detourAdvice = 'Déviation conseillée : Emprunter le Boulevard de la République en amont.';
    } else if (isDestNlongkak && congestionPct >= 60) {
      detourAdvice = 'Déviation conseillée : Passer par Dragages / Bastos pour rejoindre le centre.';
    }

    final totalDurationMinutes = nominalDuration + delayMinutes;

    // Calcul dates départ et arrivée selon isDepartureMode
    DateTime departureDateTime;
    DateTime arrivalDateTime;
    TimeOfDay targetArrivalTimeFinal;

    if (isDepartureMode) {
      departureDateTime = DateTime(
        date.year,
        date.month,
        date.day,
        effectiveTime.hour,
        effectiveTime.minute,
      );
      arrivalDateTime = departureDateTime.add(Duration(minutes: totalDurationMinutes));
      targetArrivalTimeFinal = TimeOfDay(hour: arrivalDateTime.hour, minute: arrivalDateTime.minute);
    } else {
      arrivalDateTime = DateTime(
        date.year,
        date.month,
        date.day,
        effectiveTime.hour,
        effectiveTime.minute,
      );
      departureDateTime = arrivalDateTime.subtract(Duration(minutes: totalDurationMinutes));
      targetArrivalTimeFinal = effectiveTime;
    }

    String reasoning = factors.isEmpty
        ? 'Trafic nominal fluide. Conditions de circulation idéales.'
        : '${factors.join(" • ")} (Retard estimé : +$delayMinutes min).';

    final newTrip = ScheduledTrip(
      id: 'st_${DateTime.now().millisecondsSinceEpoch}',
      title: title.isNotEmpty ? title : 'Trajet vers $destinationName',
      originName: originName,
      originPos: originPos,
      destinationName: destinationName,
      destinationPos: destinationPos,
      targetArrivalTime: targetArrivalTimeFinal,
      scheduledDate: date,
      recommendedDepartureTime: departureDateTime,
      estimatedDurationMinutes: totalDurationMinutes,
      trafficBufferMinutes: delayMinutes,
      isReminderActive: true,
      city: _selectedCity,
      aiReasoning: reasoning,
      roadStatus: roadStatus,
      roadStatusLabel: roadStatusLabel,
      congestionPercentage: congestionPct,
      averageSpeedKmh: speedKmh,
      nominalDurationMinutes: nominalDuration,
      delayMinutes: delayMinutes,
      detourAdvice: detourAdvice,
      warnings: warnings,
      isDepartureMode: isDepartureMode,
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
    _emergencyTicker?.cancel();
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
