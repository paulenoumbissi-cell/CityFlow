import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../models/traffic_node.dart';
import '../models/incident_alert.dart';
import '../models/priority_route.dart';
import '../core/constants/city_data.dart';
import '../core/services/location_service.dart';

class CityFlowProvider extends ChangeNotifier {
  String _selectedCity = 'Yaoundé';
  List<TrafficNode> _yaoundeNodes = [];
  List<TrafficNode> _doualaNodes = [];
  List<IncidentAlert> _alerts = [];
  List<PriorityRoute> _priorityRoutes = [];

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

  CityFlowProvider() {
    _loadInitialData();
    _startLiveSimulation();
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
  
  List<PriorityRoute> get currentCityPriorityRoutes => _priorityRoutes;
  PriorityRoute? get activePriorityRoute => _activePriorityRoute;
  bool get isEmergencyModeActive => _isEmergencyModeActive;
  bool get isLiveSimulating => _isLiveSimulating;

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
      _locationStatusMessage = 'Position GPS : ${result.detectedCity} (à ${result.distanceKm.toStringAsFixed(1)} km du centre)';
      final nodes = currentNodes;
      _selectedNode = nodes.isNotEmpty ? nodes.first : null;
    } else {
      _locationStatusMessage = result.errorMessage ?? 'Position par défaut : $_selectedCity';
    }

    if (!_isDisposed) notifyListeners();
  }

  void selectCity(String city) {
    if (_selectedCity != city) {
      _selectedCity = city;
      final nodes = currentNodes;
      _selectedNode = nodes.isNotEmpty ? nodes.first : null;
      notifyListeners();
    }
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
    super.dispose();
  }
}
