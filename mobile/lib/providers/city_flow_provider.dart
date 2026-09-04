import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../models/traffic_node.dart';
import '../models/incident_alert.dart';
import '../models/priority_route.dart';
import '../models/citizen_report.dart';
import '../models/citizen_reward.dart';
import '../models/emergency_mission.dart';
import '../models/smart_route.dart';
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

  // Itinéraires Multi-Critères & Éco-Mobilité
  List<SmartRoute> _smartRoutes = [];
  SmartRoute? _selectedSmartRoute;
  List<MultimodalOption> _multimodalOptions = [];
  String _activeTravelMode = 'car';
  bool _isSmartRouteLoading = false;
  bool _isGpsNavigating = false;
  int _navStepIndex = 0;
  bool _navCompleted = false;

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
  bool get navCompleted => _navCompleted;

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

      case 'EMERGENCY_MISSION_UPDATE':
        final missionJson = data['mission'];
        if (missionJson is Map<String, dynamic>) {
          final mission = EmergencyMission.fromJson(missionJson);
          if (mission.city == _selectedCity) {
            _activeEmergencyMission = mission;
            _isEmergencyModeActive = true;
            notifyListeners();
          }
        }
        break;

      case 'EMERGENCY_MISSION_CANCELLED':
        _activeEmergencyMission = null;
        _isEmergencyModeActive = false;
        notifyListeners();
        break;

      case 'TRAFFIC_PULSE':
        // Pulsation temps réel reçue avec succès
        break;
    }
  }

  void _loadInitialData() {
    _yaoundeNodes = CityData.getYaoundeNodes();
    _doualaNodes = CityData.getDoualaNodes();
    _alerts = CityData.getInitialAlerts();
    _priorityRoutes = CityData.getPriorityRoutes();
    if (_yaoundeNodes.isNotEmpty) {
      _selectedNode = _yaoundeNodes.first;
    }
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

  // --- ACTIONS ITINÉRAIRES MULTI-CRITÈRES & GUIDAGE ---
  Future<void> fetchSmartRoutes({String? origin, String? destination}) async {
    _isSmartRouteLoading = true;
    _isGpsNavigating = false;
    _navStepIndex = 0;
    _navCompleted = false;
    if (!_isDisposed) notifyListeners();

    final start = origin ?? (_selectedCity == 'Yaoundé' ? 'Mvan (Gare)' : 'Deido (Rond-point)');
    final end = destination ?? (_selectedCity == 'Yaoundé' ? 'Bastos' : 'Bonanjo');

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

  void startGpsNavigation() {
    _isGpsNavigating = true;
    _navStepIndex = 0;
    _navCompleted = false;
    notifyListeners();
  }

  void nextGpsStep() {
    if (_selectedSmartRoute != null) {
      if (_navStepIndex < _selectedSmartRoute!.steps.length - 1) {
        _navStepIndex++;
      } else {
        _navCompleted = true;
      }
      notifyListeners();
    }
  }

  void stopGpsNavigation() {
    _isGpsNavigating = false;
    _navStepIndex = 0;
    _navCompleted = false;
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

  void confirmAlert(String alertId) {
    final idx = _alerts.indexWhere((a) => a.id == alertId);
    if (idx != -1) {
      final updated = _alerts[idx].copyWith(
        confirmationsCount: _alerts[idx].confirmationsCount + 1,
      );
      _alerts[idx] = updated;
      notifyListeners();
    }
  }

  // --- CROWDSOURCING & GAMIFICATION ACTIONS ---
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

  Future<bool> addCitizenReport({
    required String title,
    required String locationDescription,
    required CitizenReportCategory category,
    required CitizenReportSeverity severity,
    LatLng? position,
  }) async {
    final report = await CityFlowMobileApiService.submitCitizenReport(
      title: title,
      city: _selectedCity,
      locationDescription: locationDescription,
      category: category,
      severity: severity,
      position: position,
    );

    if (report != null) {
      _citizenReports.insert(0, report);
      // Récupérer le profil mis à jour (+25 points)
      final profile = await CityFlowMobileApiService.fetchCitizenProfile();
      _citizenProfile = profile;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> voteCitizenReport(String reportId, String type) async {
    final success = await CityFlowMobileApiService.voteReport(reportId, type);
    if (success) {
      final idx = _citizenReports.indexWhere((r) => r.id == reportId);
      if (idx != -1) {
        final current = _citizenReports[idx];
        if (type == 'confirm') {
          _citizenReports[idx] = current.copyWith(
            confirmationsCount: current.confirmationsCount + 1,
            isVerified: current.confirmationsCount + 1 >= 3 ? true : current.isVerified,
          );
        } else if (type == 'resolved') {
          _citizenReports[idx] = current.copyWith(
            resolutionsCount: current.resolutionsCount + 1,
            status: current.resolutionsCount + 1 >= 2 ? 'resolved' : current.status,
          );
        }
      }
      final profile = await CityFlowMobileApiService.fetchCitizenProfile();
      _citizenProfile = profile;
      notifyListeners();
    }
  }

  Future<RewardCoupon?> redeemCatalogReward(String rewardId) async {
    final coupon = await CityFlowMobileApiService.redeemReward(rewardId);
    if (coupon != null) {
      final profile = await CityFlowMobileApiService.fetchCitizenProfile();
      _citizenProfile = profile;
      notifyListeners();
      return coupon;
    }
    return null;
  }

  // --- MODE SECOURS & ONDE VERTE ---
  bool get hasActiveEmergencyMission => _activeEmergencyMission != null;
  EmergencyMission? get activeEmergencyMission => _activeEmergencyMission;

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

      // 1. Tenter une synchronisation directe avec l'API Backend
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

      // 2. Moteur de dynamique et micro-variations temps réel
      final random = Random();
      
      void updateNodeList(List<TrafficNode> list, Function(List<TrafficNode>) setter) {
        final updated = list.map((n) {
          final speedDelta = (random.nextDouble() * 3.0) - 1.5;
          final newSpeed = (n.averageSpeedKmh + speedDelta).clamp(4.0, 55.0);
          final roundedSpeed = double.parse(newSpeed.toStringAsFixed(1));

          // Détermination dynamique du niveau de congestion selon la vitesse réelle
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

      // Rafraîchir le nœud sélectionné en direct
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

  @override
  void dispose() {
    _isDisposed = true;
    _simulationTimer?.cancel();
    _wsStatusSub?.cancel();
    _wsMessageSub?.cancel();
    _wsService.disconnect();
    super.dispose();
  }
}
