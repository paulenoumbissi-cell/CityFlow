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
    _simulationTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!_isLiveSimulating) return;

      final random = Random();
      _yaoundeNodes = _yaoundeNodes.map((n) {
        final delta = (random.nextDouble() * 2.0) - 1.0;
        final newSpeed = (n.averageSpeedKmh + delta).clamp(4.0, 50.0);
        return n.copyWith(
          averageSpeedKmh: double.parse(newSpeed.toStringAsFixed(1)),
          vehicleCountPerHour: (n.vehicleCountPerHour + random.nextInt(30) - 15).clamp(500, 5000),
        );
      }).toList();

      _doualaNodes = _doualaNodes.map((n) {
        final delta = (random.nextDouble() * 2.4) - 1.2;
        final newSpeed = (n.averageSpeedKmh + delta).clamp(3.0, 48.0);
        return n.copyWith(
          averageSpeedKmh: double.parse(newSpeed.toStringAsFixed(1)),
          vehicleCountPerHour: (n.vehicleCountPerHour + random.nextInt(40) - 20).clamp(500, 6000),
        );
      }).toList();

      if (_selectedNode != null) {
        final currentList = currentNodes;
        _selectedNode = currentList.firstWhere(
          (n) => n.id == _selectedNode!.id,
          orElse: () => _selectedNode!,
        );
      }

      notifyListeners();
    });
  }

  @override
  void dispose() {
    _isDisposed = true;
    _simulationTimer?.cancel();
    super.dispose();
  }
}
