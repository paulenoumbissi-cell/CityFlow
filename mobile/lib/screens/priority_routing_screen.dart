import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/smart_route.dart';
import '../models/incident_alert.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/city_data.dart';
import '../core/services/api_service.dart';
import '../models/citizen_report.dart';
import '../widgets/waze_report_modal.dart';
import 'trip_planner_screen.dart';

enum _RoutingMode {
  explore,           // Mode 1: Accueil Waze (Carte + Barre Où va-t-on ? + Raccourcis + Récents + Infos véhicule + ⚠️)
  destinationDetail, // Mode 2: Fiche Destination (Anneau Rouge + Badges + 4 boutons d'action + Horaires + Voir les itinéraires)
  routeOverview,     // Mode 3: Comparateur Waze (Tracés cliquables + Éviter + Damier + Partir plus tard / Y aller)
  activeNavigation   // Mode 4: Guidage GPS (Bannière noire + 110m + Flèche 3D + Compteur noir + Barre 8:23 + Hors-itinéraire)
}

class PriorityRoutingScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const PriorityRoutingScreen({super.key, this.onNavigateTab});

  @override
  State<PriorityRoutingScreen> createState() => _PriorityRoutingScreenState();
}

class _PriorityRoutingScreenState extends State<PriorityRoutingScreen> with SingleTickerProviderStateMixin {
  _RoutingMode _currentMode = _RoutingMode.explore;
  CityLandmark? _selectedDestinationLandmark;

  late String _selectedDeparture;
  late String _selectedDestination;
  LatLng? _departureCoords;
  LatLng? _destinationCoords;

  final MapController _mapController = MapController();
  final String _activeCategoryFilter = 'all';
  bool _isEmergencyPanelOpen = false;

  // Selected vehicle type for "Infos véhicule ▾"
  String _selectedVehicleType = 'Voiture';

  // Waze Itinerary Features
  bool _avoidTolls = false;
  bool _avoidUnpaved = false;
  bool _avoidFlooded = false;

  LatLng? _lastTrackedNavPos;
  String? _lastRenderedRouteId;

  late final DraggableScrollableController _sheetController;

  @override
  void initState() {
    super.initState();
    _sheetController = DraggableScrollableController();
    _selectedDeparture = 'Ma position (GPS en direct)';
    _selectedDestination = 'TOTAL BASTOS';

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final provider = Provider.of<CityFlowProvider>(context, listen: false);
      if (provider.userRealPosition == null) {
        await provider.autoDetectUserCity(notify: false);
      }
    });
  }

  void _fitRouteBounds(List<LatLng> coords) {
    if (coords.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      try {
        final bounds = LatLngBounds.fromPoints(coords);
        _mapController.fitCamera(
          CameraFit.bounds(
            bounds: bounds,
            padding: const EdgeInsets.only(top: 130, bottom: 270, left: 35, right: 35),
          ),
        );
      } catch (_) {}
    });
  }

  void _selectDestinationFromLandmark(CityLandmark landmark, CityFlowProvider provider) {
    setState(() {
      _selectedDestinationLandmark = landmark;
      _selectedDestination = landmark.name;
      _destinationCoords = landmark.pos;
      _currentMode = _RoutingMode.destinationDetail;
    });

    _mapController.move(landmark.pos, 16.0);
  }

  @override
  void dispose() {
    _sheetController.dispose();
    super.dispose();
  }

  void _requestRouteAndShowOverview(CityFlowProvider provider) async {
    final originParam = _departureCoords ?? provider.userRealPosition ?? provider.currentCityCenter;
    final destParam = _destinationCoords ?? _selectedDestinationLandmark?.pos ?? _selectedDestination;

    setState(() {
      _currentMode = _RoutingMode.routeOverview;
    });

    if (_sheetController.isAttached) {
      _sheetController.animateTo(0.42, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    }

    await provider.fetchSmartRoutes(origin: originParam, destination: destParam);

    if (provider.selectedSmartRoute != null && provider.selectedSmartRoute!.coordinates.isNotEmpty) {
      _fitRouteBounds(provider.selectedSmartRoute!.coordinates);
    }
  }

  void _startLiveNavigation(CityFlowProvider provider) async {
    setState(() {
      _currentMode = _RoutingMode.activeNavigation;
      _lastTrackedNavPos = null;
    });

    final originParam = _departureCoords ?? provider.userRealPosition ?? provider.currentCityCenter;
    final destParam = _destinationCoords ?? _selectedDestinationLandmark?.pos ?? _selectedDestination;

    await provider.fetchSmartRoutes(origin: originParam, destination: destParam);
    await provider.startGpsNavigation(autoSimulate: false);

    final navPos = provider.currentNavPosition;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _mapController.move(navPos, 17.0);
      }
    });
  }

  void _exitNavigation(CityFlowProvider provider) {
    provider.stopGpsNavigation();
    setState(() {
      _currentMode = _RoutingMode.routeOverview;
      _lastTrackedNavPos = null;
    });
    if (provider.selectedSmartRoute != null && provider.selectedSmartRoute!.coordinates.isNotEmpty) {
      _fitRouteBounds(provider.selectedSmartRoute!.coordinates);
    }
  }

  void _exitToExplore() {
    setState(() {
      _currentMode = _RoutingMode.explore;
      _selectedDestinationLandmark = null;
    });
  }

  void _openSearchModal({
    required BuildContext context,
    required bool isDeparture,
    required CityFlowProvider provider,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _GoogleMapsSearchModal(
        isDeparture: isDeparture,
        currentSelection: isDeparture ? _selectedDeparture : _selectedDestination,
        selectedCity: provider.selectedCity,
        userGpsPosition: provider.userRealPosition,
        landmarks: provider.currentCityLandmarks,
        onSelectLandmark: (landmark) {
          Navigator.pop(ctx);
          if (isDeparture) {
            setState(() {
              _selectedDeparture = landmark.name;
              _departureCoords = landmark.pos;
            });
            if (_currentMode == _RoutingMode.routeOverview) {
              provider.fetchSmartRoutes(
                origin: _departureCoords ?? _selectedDeparture,
                destination: _destinationCoords ?? _selectedDestination,
              );
            }
          } else {
            _selectDestinationFromLandmark(landmark, provider);
          }
        },
        onSelectGpsPosition: (pos) {
          Navigator.pop(ctx);
          setState(() {
            if (isDeparture) {
              _selectedDeparture = 'Ma position (GPS en direct)';
              _departureCoords = pos;
            } else {
              _selectedDestination = 'Ma position (GPS en direct)';
              _destinationCoords = pos;
            }
          });
          if (_currentMode == _RoutingMode.routeOverview) {
            provider.fetchSmartRoutes(
              origin: _departureCoords ?? _selectedDeparture,
              destination: _destinationCoords ?? _selectedDestination,
            );
          }
        },
      ),
    );
  }

  void _showVehicleInfoModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final vehicleTypes = [
            {'type': 'Voiture', 'icon': Icons.directions_car_rounded, 'desc': 'Voiture personnelle ou VTC (standard)'},
            {'type': 'Taxi jaune', 'icon': Icons.local_taxi_rounded, 'desc': 'Tarification urbaine standard et arrêts réguliers'},
            {'type': 'Moto-taxi', 'icon': Icons.two_wheeler_rounded, 'desc': 'Circulation rapide entre les files et raccourcis'},
            {'type': 'Transport en commun', 'icon': Icons.directions_bus_rounded, 'desc': 'Bus urbain, navettes et lignes régulières'},
            {'type': 'Camion / Livraison', 'icon': Icons.local_shipping_rounded, 'desc': 'Évitement des rues étroites et ponts bas'},
          ];

          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Infos véhicule & Profil',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Color(0xFF0F172A)),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...vehicleTypes.map((vt) {
                      final isSelected = _selectedVehicleType == vt['type'];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF007AFF).withValues(alpha: 0.08) : Colors.transparent,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF007AFF) : const Color(0xFFE2E8F0),
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: ListTile(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF007AFF).withValues(alpha: 0.15) : const Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              vt['icon'] as IconData,
                              color: isSelected ? const Color(0xFF007AFF) : const Color(0xFF475569),
                              size: 22,
                            ),
                          ),
                          title: Text(
                            vt['type'] as String,
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: isSelected ? const Color(0xFF007AFF) : const Color(0xFF0F172A),
                            ),
                          ),
                          subtitle: Text(
                            vt['desc'] as String,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                          trailing: isSelected
                              ? const Icon(Icons.check_circle_rounded, color: Color(0xFF007AFF), size: 22)
                              : null,
                          onTap: () {
                            setState(() => _selectedVehicleType = vt['type'] as String);
                            setModalState(() {});
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Profil véhicule : $_selectedVehicleType'),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  AlertCategory _mapCitizenCategoryToAlertCategory(CitizenReportCategory cat) {
    switch (cat) {
      case CitizenReportCategory.trafficJam:
      case CitizenReportCategory.motoRush:
      case CitizenReportCategory.police:
        return AlertCategory.trafficBlock;
      case CitizenReportCategory.trafficLight:
      case CitizenReportCategory.breakdown:
      case CitizenReportCategory.truckBreakdown:
      case CitizenReportCategory.sosHelp:
      case CitizenReportCategory.other:
        return AlertCategory.breakdown;
      case CitizenReportCategory.accident:
        return AlertCategory.accident;
      case CitizenReportCategory.roadworks:
      case CitizenReportCategory.closure:
      case CitizenReportCategory.funeral:
      case CitizenReportCategory.hazard:
        return AlertCategory.roadwork;
      case CitizenReportCategory.flooding:
      case CitizenReportCategory.gasStation:
        return AlertCategory.flood;
    }
  }

  void _showCommunityReportModal(BuildContext context, CityFlowProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WazeReportGridModal(
        selectedCity: provider.selectedCity,
        onReportSubmitted: (category, severity, title, location) async {
          final scaffoldMessenger = ScaffoldMessenger.of(context);
          final pos = provider.userRealPosition ?? provider.currentCityCenter;

          final alertCat = _mapCitizenCategoryToAlertCategory(category);
          provider.addAlert(
            title: title,
            locationDescription: location,
            position: pos,
            severity: severity == CitizenReportSeverity.high || severity == CitizenReportSeverity.critical
                ? AlertSeverity.high
                : AlertSeverity.moderate,
            category: alertCat,
          );

          await provider.addCitizenReport(
            title: title,
            locationDescription: location,
            category: category,
            severity: severity,
            position: pos,
          );

          scaffoldMessenger.showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Merci ! "$title" a été partagé avec la communauté (+25 pts).',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFF10B981),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final isMissionActive = provider.hasActiveEmergencyMission;
    final activeMission = provider.activeEmergencyMission;
    final landmarks = provider.currentCityLandmarks;
    final userPos = provider.userRealPosition ?? provider.currentCityCenter;
    final selectedRoute = provider.selectedSmartRoute;

    // Synchronisation du mode si le provider change d'état
    if (provider.isGpsNavigating && _currentMode != _RoutingMode.activeNavigation) {
      _currentMode = _RoutingMode.activeNavigation;
    } else if (provider.shouldShowRouteOverview) {
      provider.clearRouteOverviewTrigger();
      _currentMode = _RoutingMode.routeOverview;
      if (provider.targetDestinationName != null && provider.targetDestinationName!.isNotEmpty) {
        _selectedDestination = provider.targetDestinationName!;
      }
      if (provider.targetOriginName != null && provider.targetOriginName!.isNotEmpty) {
        _selectedDeparture = provider.targetOriginName!;
      }
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          if (provider.selectedSmartRoute != null && provider.selectedSmartRoute!.coordinates.isNotEmpty) {
            _fitRouteBounds(provider.selectedSmartRoute!.coordinates);
          }
          if (_sheetController.isAttached) {
            _sheetController.animateTo(0.42, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
          }
        }
      });
    }

    // Suivi automatique de la caméra en mode navigation active
    if (_currentMode == _RoutingMode.activeNavigation) {
      final navPos = provider.currentNavPosition;
      if (_lastTrackedNavPos == null ||
          (_lastTrackedNavPos!.latitude - navPos.latitude).abs() > 0.00001 ||
          (_lastTrackedNavPos!.longitude - navPos.longitude).abs() > 0.00001) {
        _lastTrackedNavPos = navPos;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _currentMode == _RoutingMode.activeNavigation) {
            _mapController.move(navPos, 16.8);
          }
        });
      }
    } else if (_currentMode == _RoutingMode.routeOverview && selectedRoute != null) {
      if (_lastRenderedRouteId != selectedRoute.id) {
        _lastRenderedRouteId = selectedRoute.id;
        if (selectedRoute.coordinates.isNotEmpty) {
          _fitRouteBounds(selectedRoute.coordinates);
        }
      }
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_isEmergencyPanelOpen) {
          setState(() => _isEmergencyPanelOpen = false);
          return;
        }
        if (_currentMode == _RoutingMode.activeNavigation) {
          _exitNavigation(provider);
          return;
        }
        if (_currentMode == _RoutingMode.routeOverview) {
          if (_selectedDestinationLandmark != null) {
            setState(() => _currentMode = _RoutingMode.destinationDetail);
          } else {
            _exitToExplore();
          }
          return;
        }
        if (_currentMode == _RoutingMode.destinationDetail) {
          _exitToExplore();
          return;
        }
        if (_currentMode == _RoutingMode.explore) {
          if (Navigator.canPop(context)) {
            Navigator.pop(context);
          } else {
            widget.onNavigateTab?.call(0);
          }
          return;
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        resizeToAvoidBottomInset: false,
        body: SizedBox.expand(
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 1. CARTE PLEIN ÉCRAN FLUTTER MAP
              Positioned.fill(
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _currentMode == _RoutingMode.activeNavigation
                        ? provider.currentNavPosition
                        : (_currentMode == _RoutingMode.destinationDetail && _selectedDestinationLandmark != null
                            ? _selectedDestinationLandmark!.pos
                            : (selectedRoute != null && selectedRoute.coordinates.isNotEmpty
                                ? selectedRoute.coordinates.first
                                : userPos)),
                    initialZoom: _currentMode == _RoutingMode.activeNavigation
                        ? 17.0
                        : (_currentMode == _RoutingMode.destinationDetail ? 16.0 : 14.5),
                    onTap: (_, latLng) {
                      if (_currentMode == _RoutingMode.destinationDetail) {
                        // Keep location open or do nothing
                      }
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'cm.cityflow.mobile',
                    ),

                    // 0) CORRIDOR D'URGENCE & ONDE VERTE (SI MISSION ACTIVE)
                    if (activeMission != null && activeMission.coordinates.isNotEmpty) ...[
                      PolylineLayer(
                        polylines: [
                          Polyline(
                            points: activeMission.coordinates,
                            strokeWidth: 16.0,
                            color: (activeMission.vehicleType == 'firefighters' ? const Color(0xFFEA580C) : const Color(0xFFDC2626)).withValues(alpha: 0.35),
                          ),
                          Polyline(
                            points: activeMission.coordinates,
                            strokeWidth: 8.0,
                            color: activeMission.vehicleType == 'firefighters' ? const Color(0xFFF97316) : const Color(0xFFEF4444),
                            strokeCap: StrokeCap.round,
                            strokeJoin: StrokeJoin.round,
                          ),
                          Polyline(
                            points: activeMission.coordinates,
                            strokeWidth: 3.0,
                            color: Colors.white.withValues(alpha: 0.95),
                            strokeCap: StrokeCap.round,
                            strokeJoin: StrokeJoin.round,
                          ),
                        ],
                      ),
                    ],

                    // 1) ROUTES ALTERNATIVES AVEC SEGMENTS DE TRAFIC (STYLE WAZE)
                    if (_currentMode == _RoutingMode.routeOverview && provider.smartRoutes.length > 1) ...[
                      PolylineLayer(
                        polylines: provider.smartRoutes
                            .where((r) => r.id != selectedRoute?.id)
                            .map((r) => Polyline(
                                  points: r.coordinates,
                                  strokeWidth: 8.5,
                                  color: const Color(0xFF7C3AED).withValues(alpha: 0.35),
                                ))
                            .toList(),
                      ),
                      PolylineLayer(
                        polylines: provider.smartRoutes
                            .where((r) => r.id != selectedRoute?.id)
                            .expand((r) {
                              if (r.trafficSegments.isNotEmpty) {
                                return r.trafficSegments.map((seg) => Polyline(
                                      points: seg.coordinates,
                                      strokeWidth: 5.5,
                                      color: seg.color.withValues(alpha: 0.7),
                                      strokeCap: StrokeCap.round,
                                      strokeJoin: StrokeJoin.round,
                                    ));
                              }
                              return [
                                Polyline(
                                  points: r.coordinates,
                                  strokeWidth: 5.5,
                                  color: const Color(0xFFC4B5FD),
                                  strokeCap: StrokeCap.round,
                                  strokeJoin: StrokeJoin.round,
                                ),
                              ];
                            })
                            .toList(),
                      ),
                    ],

                    // 2) ITINÉRAIRE PRINCIPAL SÉLECTIONNÉ AVEC SEGMENTS DE TRAFIC EN DIRECT
                    if ((_currentMode == _RoutingMode.routeOverview || _currentMode == _RoutingMode.activeNavigation) &&
                        selectedRoute != null &&
                        selectedRoute.coordinates.length >= 2) ...[
                      PolylineLayer(
                        polylines: [
                          Polyline(
                            points: selectedRoute.coordinates,
                            strokeWidth: 10.5,
                            color: const Color(0xFF3B0764),
                          ),
                        ],
                      ),
                      PolylineLayer(
                        polylines: selectedRoute.trafficSegments.isNotEmpty
                            ? selectedRoute.trafficSegments
                                .where((seg) => seg.coordinates.length >= 2)
                                .map((seg) => Polyline(
                                      points: seg.coordinates,
                                      strokeWidth: 7.0,
                                      color: seg.color,
                                      strokeCap: StrokeCap.round,
                                      strokeJoin: StrokeJoin.round,
                                    ))
                                .toList()
                            : [
                                Polyline(
                                  points: selectedRoute.coordinates,
                                  strokeWidth: 7.0,
                                  color: const Color(0xFF10B981),
                                  strokeCap: StrokeCap.round,
                                  strokeJoin: StrokeJoin.round,
                                ),
                              ],
                      ),
                    ],

                    // 2.5) ITINÉRAIRES ALTERNATIFS EN CAS DE SORTIE DE ROUTE (HORS-ITINÉRAIRE)
                    if (_currentMode == _RoutingMode.activeNavigation && provider.isOffRoute && provider.offRouteAlternatives.isNotEmpty) ...[
                      PolylineLayer(
                        polylines: provider.offRouteAlternatives
                            .where((r) => r.id != selectedRoute?.id)
                            .map((r) => Polyline(
                                  points: r.coordinates,
                                  strokeWidth: 6.5,
                                  color: const Color(0xFF0284C7).withValues(alpha: 0.8),
                                  strokeCap: StrokeCap.round,
                                  strokeJoin: StrokeJoin.round,
                                ))
                            .toList(),
                      ),
                    ],

                    // 3) MARQUEURS DE DESTINATION / POINTS D'INTÉRÊTS & BADGES INTERACTIFS WAZE
                    MarkerLayer(
                      markers: [
                        // Position de l'utilisateur (Point Bleu Pulsant) en mode Explore ou Overview ou DestinationDetail
                        if (_currentMode != _RoutingMode.activeNavigation)
                          Marker(
                            point: userPos,
                            width: 34,
                            height: 34,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00C3FF).withValues(alpha: 0.3),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                Container(
                                  width: 16,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00C3FF),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2.5),
                                    boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 4)],
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // MODE 2 : MARQUEUR ANNEAU ROUGE WAZE SUR LA DESTINATION SÉLECTIONNÉE
                        if (_currentMode == _RoutingMode.destinationDetail && _selectedDestinationLandmark != null)
                          Marker(
                            point: _selectedDestinationLandmark!.pos,
                            width: 64,
                            height: 64,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Halo rouge pulsant
                                Container(
                                  width: 58,
                                  height: 58,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFFEF4444).withValues(alpha: 0.25),
                                  ),
                                ),
                                // Anneau Waze signature rouge et blanc
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white,
                                    border: Border.all(color: const Color(0xFFDC2626), width: 5.0),
                                    boxShadow: const [
                                      BoxShadow(color: Colors.black38, blurRadius: 8, offset: Offset(0, 3)),
                                    ],
                                  ),
                                  child: Center(
                                    child: Container(
                                      width: 10,
                                      height: 10,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: Color(0xFFDC2626),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // BADGES FLOTTANTS DES ITINÉRAIRES EN TEMPS RÉEL SUR LA CARTE (STYLE WAZE)
                        if (_currentMode == _RoutingMode.routeOverview) ...[
                          // Itinéraire sélectionné (Badge Violet Foncé Waze "19 min / Meilleur itin.")
                          if (selectedRoute != null && selectedRoute.coordinates.length >= 2)
                            Marker(
                              point: selectedRoute.coordinates[selectedRoute.coordinates.length ~/ 2],
                              width: 125,
                              height: 58,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF3B0764),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF581C87), width: 1.5),
                                  boxShadow: const [
                                    BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 3)),
                                  ],
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '${selectedRoute.durationMinutes} min',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                                    ),
                                    const Text(
                                      'Meilleur itin.',
                                      style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w800, fontSize: 10),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                          // Itinéraires alternatifs cliquables sur la carte (Badge Blanc Waze "23 min")
                          ...provider.smartRoutes.where((r) => r.id != selectedRoute?.id).map((altRoute) {
                            if (altRoute.coordinates.length < 2) return null;
                            final mid = altRoute.coordinates[altRoute.coordinates.length ~/ 2];

                            return Marker(
                              point: mid,
                              width: 85,
                              height: 42,
                              child: GestureDetector(
                                onTap: () {
                                  provider.selectSmartRoute(altRoute);
                                  _fitRouteBounds(altRoute.coordinates);
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                                    boxShadow: const [
                                      BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2)),
                                    ],
                                  ),
                                  child: Center(
                                    child: Text(
                                      '${altRoute.durationMinutes} min',
                                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 13),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).whereType<Marker>(),
                        ],

                        // Marqueurs de Départ & Arrivée Waze (Drapeau à Damier 🏁)
                        if (_currentMode == _RoutingMode.routeOverview && selectedRoute != null && selectedRoute.coordinates.isNotEmpty) ...[
                          // Départ
                          Marker(
                            point: selectedRoute.coordinates.first,
                            width: 36,
                            height: 36,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00C3FF).withValues(alpha: 0.35),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                Container(
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00C3FF),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 3),
                                    boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 4)],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Arrivée (Drapeau à damier Waze 🏁)
                          Marker(
                            point: selectedRoute.coordinates.last,
                            width: 44,
                            height: 44,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                border: Border.all(color: const Color(0xFF1E2024), width: 3),
                                boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 3))],
                              ),
                              child: const Center(
                                child: Icon(Icons.sports_score_rounded, color: Colors.black, size: 22),
                              ),
                            ),
                          ),
                        ],

                        // Lieux & Carrefours de la ville en mode Explore
                        if (_currentMode == _RoutingMode.explore)
                          ...landmarks
                              .where((l) => _activeCategoryFilter == 'all' || l.category == _activeCategoryFilter)
                              .map((l) {
                            final isSelected = _selectedDestinationLandmark?.id == l.id;
                            final color = _getCategoryColor(l.category);
                            return Marker(
                              point: l.pos,
                              width: isSelected ? 48 : 36,
                              height: isSelected ? 48 : 36,
                              child: GestureDetector(
                                onTap: () => _selectDestinationFromLandmark(l, provider),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  decoration: BoxDecoration(
                                    color: isSelected ? color : Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? Colors.white : color,
                                      width: isSelected ? 3 : 2,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: color.withValues(alpha: isSelected ? 0.5 : 0.25),
                                        blurRadius: isSelected ? 10 : 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Center(
                                    child: Icon(
                                      _getCategoryIcon(l.category),
                                      color: isSelected ? Colors.white : color,
                                      size: isSelected ? 24 : 18,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }),

                        // VÉHICULE EN NAVIGATION ACTIVE (FLÈCHE 3D ORIENTÉE)
                        if (_currentMode == _RoutingMode.activeNavigation)
                          Marker(
                            point: provider.currentNavPosition,
                            width: 60,
                            height: 60,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00C3FF).withValues(alpha: 0.25),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                Transform.rotate(
                                  angle: (provider.navBearing * (pi / 180.0)),
                                  child: Container(
                                    width: 34,
                                    height: 34,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF00C3FF),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 3),
                                      boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 3))],
                                    ),
                                    child: const Center(
                                      child: Icon(Icons.navigation_rounded, color: Colors.black, size: 18),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // MARQUEURS DE MISSION D'URGENCE (VÉHICULE EN MISSION & ONDE VERTE)
                        if (activeMission != null) ...[
                          ...activeMission.intersections.map((intLight) {
                            final isGreen = intLight.state == 'green_wave';
                            return Marker(
                              point: intLight.position,
                              width: 44,
                              height: 44,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isGreen ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2.5),
                                  boxShadow: [
                                    BoxShadow(
                                      color: isGreen ? const Color(0xFF10B981).withValues(alpha: 0.6) : Colors.black26,
                                      blurRadius: 10,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: Icon(
                                    isGreen ? Icons.traffic_rounded : Icons.timer_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ),
                            );
                          }),
                          if (activeMission.coordinates.isNotEmpty)
                            Marker(
                              point: activeMission.coordinates[activeMission.currentStepIndex.clamp(0, activeMission.coordinates.length - 1)],
                              width: 60,
                              height: 60,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    width: 56,
                                    height: 56,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: (activeMission.vehicleType == 'firefighters' ? const Color(0xFFEA580C) : const Color(0xFFDC2626)).withValues(alpha: 0.35),
                                    ),
                                  ),
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: activeMission.vehicleType == 'firefighters' ? const Color(0xFFEA580C) : const Color(0xFFDC2626),
                                      border: Border.all(color: Colors.white, width: 3),
                                      boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 3))],
                                    ),
                                    child: Center(
                                      child: Icon(
                                        activeMission.vehicleType == 'firefighters' ? Icons.fire_truck_rounded : Icons.medical_services_rounded,
                                        color: Colors.white,
                                        size: 22,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),

              // 2. OVERLAYS SELON LE MODE WAZE
              // A) MODE 1 : ACCUEIL WAZE (EXPLORE)
              if (_currentMode == _RoutingMode.explore) ...[
                _buildWazeExploreFloatingVehiclePill(context),
                _buildWazeExploreSheet(context, provider),
              ],

              // B) MODE 2 : FICHE DÉTAILLÉE DESTINATION (LOCATION)
              if (_currentMode == _RoutingMode.destinationDetail && _selectedDestinationLandmark != null) ...[
                _buildWazeDestinationDetailTopBar(context),
                _buildWazeDestinationDetailSheet(context, provider, _selectedDestinationLandmark!),
              ],

              // C) MODE 3 : ROUTE OVERVIEW (COMPARATEUR WAZE)
              if (_currentMode == _RoutingMode.routeOverview) ...[
                _buildWazeRouteBottomCard(context, provider, selectedRoute),
                _buildWazeRouteHeader(context, provider),
              ],

              // D) MODE 4 : ACTIVE NAVIGATION HUD (GUIDAGE GPS EN DIRECT)
              if (_currentMode == _RoutingMode.activeNavigation) ...[
                _buildActiveNavigationHud(context, provider, selectedRoute),
              ],

              // BANNIÈRE TOP MISSION D'URGENCE (ONDE VERTE EN DIRECT)
              if (activeMission != null)
                Positioned(
                  top: MediaQuery.of(context).padding.top + 8,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: activeMission.vehicleType == 'firefighters' ? const Color(0xFFEA580C) : const Color(0xFFDC2626),
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (activeMission.vehicleType == 'firefighters' ? const Color(0xFFEA580C) : const Color(0xFFDC2626)).withValues(alpha: 0.4),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: activeMission.vehicleType == 'firefighters' ? const Color(0xFFEA580C) : const Color(0xFFDC2626),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            activeMission.vehicleType == 'firefighters' ? Icons.fire_truck_rounded : Icons.medical_services_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    '🚨 ${activeMission.vehicleName}',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFF10B981), width: 1),
                                    ),
                                    child: const Text(
                                      'ONDE VERTE',
                                      style: TextStyle(color: Color(0xFF10B981), fontSize: 9, fontWeight: FontWeight.w900),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${activeMission.corridorName} • +${activeMission.timeSavedMinutes} min gagnées',
                                style: const TextStyle(color: Colors.white70, fontSize: 11),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                          onPressed: () async {
                            await provider.cancelEmergency();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Mission d\'urgence terminée.')),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ),

              // BOUTONS FLOTTANTS (RECENTRER, MODE SECOURS, SIGNALEMENT WAZE)
              if (_currentMode == _RoutingMode.explore || _currentMode == _RoutingMode.destinationDetail)
                Positioned(
                  right: 16,
                  bottom: _currentMode == _RoutingMode.explore ? 340.0 : 360.0,
                  child: Column(
                    children: [
                      // Bouton Jaune Signalement Communauté Waze (⚠️ +)
                      FloatingActionButton(
                        heroTag: 'btn_waze_report_hazard',
                        backgroundColor: const Color(0xFFFBBF24),
                        foregroundColor: const Color(0xFF0F172A),
                        elevation: 4,
                        onPressed: () => _showCommunityReportModal(context, provider),
                        child: const Icon(Icons.warning_amber_rounded, size: 28),
                      ),
                      const SizedBox(height: 10),
                      // Bouton Mode Secours Flottant
                      FloatingActionButton.small(
                        heroTag: 'btn_emergency_toggle',
                        backgroundColor: isMissionActive ? const Color(0xFFDC2626) : Colors.white,
                        foregroundColor: isMissionActive ? Colors.white : const Color(0xFFDC2626),
                        elevation: 3,
                        onPressed: () {
                          setState(() => _isEmergencyPanelOpen = !_isEmergencyPanelOpen);
                        },
                        child: Icon(isMissionActive ? Icons.emergency_rounded : Icons.local_hospital_rounded, size: 20),
                      ),
                      const SizedBox(height: 10),
                      // Bouton Recentrer sur ma position GPS
                      FloatingActionButton.small(
                        heroTag: 'btn_recenter_gps',
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF007AFF),
                        elevation: 3,
                        onPressed: () {
                          _mapController.move(userPos, 15.5);
                        },
                        child: const Icon(Icons.my_location_rounded, size: 20),
                      ),
                    ],
                  ),
                ),

              // TIROIR MODE SECOURS (SI OUVERT)
              if (_isEmergencyPanelOpen)
                _buildEmergencyDrawer(context, provider),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // ÉTAPE 1 : ACCUEIL WAZE (MODE EXPLORE)
  // ==========================================

  // Pilule bleue flottante "Infos véhicule ▾"
  Widget _buildWazeExploreFloatingVehiclePill(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 0, 0),
          child: GestureDetector(
            onTap: () => _showVehicleInfoModal(context),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF007AFF),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF007AFF).withValues(alpha: 0.35),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.directions_car_rounded, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    _selectedVehicleType == 'Voiture' ? 'Infos véhicule' : _selectedVehicleType,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 18),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Bottom Sheet Draggable Waze : "Où va-t-on ?", Domicile, Travail, Nouveau, et Récemment
  Widget _buildWazeExploreSheet(BuildContext context, CityFlowProvider provider) {
    final landmarks = provider.currentCityLandmarks;
    final userPos = provider.userRealPosition ?? provider.currentCityCenter;

    return Positioned.fill(
      child: DraggableScrollableSheet(
        initialChildSize: 0.38,
        minChildSize: 0.12,
        maxChildSize: 0.88,
        snap: true,
        snapSizes: const [0.12, 0.38, 0.88],
        builder: (context, scrollController) {
          return Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.18),
                  blurRadius: 22,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: ListView(
                controller: scrollController,
                padding: EdgeInsets.zero,
                physics: const ClampingScrollPhysics(),
                children: [
                  // Poignée supérieure de drag
                  Padding(
                    padding: const EdgeInsets.only(top: 10, bottom: 8),
                    child: Center(
                      child: Container(
                        width: 38,
                        height: 4.5,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2.5),
                        ),
                      ),
                    ),
                  ),

                  // Barre de recherche "Où va-t-on ?"
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: InkWell(
                      onTap: () => _openSearchModal(context: context, isDeparture: false, provider: provider),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search_rounded, color: Color(0xFF0F172A), size: 22),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                'Où va-t-on ?',
                                style: TextStyle(
                                  color: Color(0xFF334155),
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                provider.selectedCity,
                                style: const TextStyle(
                                  color: Color(0xFF007AFF),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Raccourcis Horizontaux Waze : Domicile, Travail, Nouveau
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildWazeShortcutPill(
                          icon: Icons.home_rounded,
                          label: 'Domicile',
                          color: const Color(0xFF007AFF),
                          onTap: () {
                            final homeLandmark = landmarks.firstWhere(
                              (l) => l.name.toLowerCase().contains('bastos') || l.name.toLowerCase().contains('bonanjo'),
                              orElse: () => landmarks.first,
                            );
                            _selectDestinationFromLandmark(homeLandmark, provider);
                          },
                        ),
                        _buildWazeShortcutPill(
                          icon: Icons.work_rounded,
                          label: 'Travail',
                          color: const Color(0xFF0284C7),
                          onTap: () {
                            final workLandmark = landmarks.firstWhere(
                              (l) => l.name.toLowerCase().contains('poste') || l.name.toLowerCase().contains('akwa'),
                              orElse: () => landmarks.last,
                            );
                            _selectDestinationFromLandmark(workLandmark, provider);
                          },
                        ),
                        _buildWazeShortcutPill(
                          icon: Icons.add_rounded,
                          label: 'Nouveau',
                          color: const Color(0xFF64748B),
                          onTap: () => _openSearchModal(context: context, isDeparture: false, provider: provider),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 8),

                  // Titre Section "Récemment & Lieux suggérés"
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    child: Text(
                      'Récemment',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),

                  // Liste des Destinations Récentes / Lieux suggérés
                  ...landmarks.map((landmark) {
                    final dLat = (landmark.pos.latitude - userPos.latitude).abs() * 111.0;
                    final dLng = (landmark.pos.longitude - userPos.longitude).abs() * 111.0;
                    final distKm = (sqrt(dLat * dLat + dLng * dLng)).toStringAsFixed(1);

                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
                      leading: Container(
                        width: 38,
                        height: 38,
                        decoration: const BoxDecoration(
                          color: Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.history_rounded, color: Color(0xFF475569), size: 20),
                      ),
                      title: Text(
                        landmark.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        '${landmark.district}, ${provider.selectedCity} • $distKm km',
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: const Icon(Icons.more_vert_rounded, color: Color(0xFF94A3B8), size: 20),
                      onTap: () => _selectDestinationFromLandmark(landmark, provider),
                    );
                  }),
                  const SizedBox(height: 28),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWazeShortcutPill({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  // ==============================================================
  // ÉTAPE 2 : FICHE DÉTAILLÉE DESTINATION (LOCATION / PLACE DETAIL)
  // ==============================================================

  // Boutons Retour ‹ et Fermer ✕ flottants
  Widget _buildWazeDestinationDetailTopBar(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Bouton Retour ‹
              GestureDetector(
                onTap: _exitToExplore,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
                  ),
                ),
              ),
              // Bouton Fermer ✕
              GestureDetector(
                onTap: _exitToExplore,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(Icons.close_rounded, color: Color(0xFF0F172A), size: 22),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Bottom Sheet Fiche Destination Waze épurée et moderne
  Widget _buildWazeDestinationDetailSheet(BuildContext context, CityFlowProvider provider, CityLandmark landmark) {
    final userPos = provider.userRealPosition ?? provider.currentCityCenter;
    final dLat = (landmark.pos.latitude - userPos.latitude).abs() * 111.0;
    final dLng = (landmark.pos.longitude - userPos.longitude).abs() * 111.0;
    final distKm = (sqrt(dLat * dLat + dLng * dLng)).toStringAsFixed(1);

    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 22,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Poignée
              Center(
                child: Container(
                  width: 38,
                  height: 4.5,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2.5),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // En-tête : Nom du lieu + Distance + Bouton Fermer
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          landmark.name,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.5,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${landmark.district}, ${provider.selectedCity} • ${_getCategoryLabel(landmark.category)}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Badge Distance
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.directions_car_rounded, color: Color(0xFF007AFF), size: 14),
                        const SizedBox(width: 4),
                        Text(
                          '$distKm km',
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Bouton Fermer (X)
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _currentMode = _RoutingMode.explore;
                        _selectedDestinationLandmark = null;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 18),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Gros Bouton Bleu "Voir les itinéraires"
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF007AFF),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 2,
                ),
                onPressed: () => _requestRouteAndShowOverview(provider),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.directions_rounded, size: 22, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Voir les itinéraires',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ==============================================================
  // ÉTAPE 3 : ROUTE OVERVIEW (COMPARATEUR & APERÇU WAZE)
  // ==============================================================

  // Barre supérieure flottante blanche avec retour & pastille Éviter ⌵
  // SANS Hamburger ☰, SANS Musique 🎵, SANS Son 🔊 (conformément à l'instruction de l'utilisateur)
  Widget _buildWazeRouteHeader(BuildContext context, CityFlowProvider provider) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Barre de titre flottante Blanche
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 10, offset: const Offset(0, 3)),
                  ],
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A), size: 22),
                      onPressed: () {
                        if (_selectedDestinationLandmark != null) {
                          setState(() => _currentMode = _RoutingMode.destinationDetail);
                        } else {
                          _exitToExplore();
                        }
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Votre position → ${_selectedDestination.replaceAll(' (Ambassades)', '')}',
                        style: const TextStyle(
                          color: Color(0xFF0F172A),
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Pastille [ Éviter ⌵ ] flottante à gauche
              GestureDetector(
                onTap: () => _showAvoidOptionsModal(context, provider),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 6, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Éviter',
                        style: TextStyle(
                          color: Color(0xFF0284C7),
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF0284C7), size: 18),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Tiroir inférieur multi-itinéraires Waze
  Widget _buildWazeRouteBottomCard(BuildContext context, CityFlowProvider provider, SmartRoute? selectedRoute) {
    final routes = provider.smartRoutes;
    if (routes.isEmpty) return const SizedBox.shrink();

    final activeRoute = selectedRoute ?? routes.first;

    return DraggableScrollableSheet(
      controller: _sheetController,
      initialChildSize: 0.42,
      minChildSize: 0.12,
      maxChildSize: 0.88,
      snap: true,
      snapSizes: const [0.12, 0.42, 0.88],
      builder: (BuildContext context, ScrollController scrollController) {
        return ListenableBuilder(
          listenable: _sheetController,
          builder: (context, _) {
            final currentSize = _sheetController.isAttached ? _sheetController.size : 0.42;
            final isCollapsed = currentSize <= 0.20;

            return Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.22),
                    blurRadius: 18,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: isCollapsed
                  ? _buildCollapsedWazeBar(context, provider, activeRoute, scrollController)
                  : _buildExpandedWazeSheet(context, provider, routes, selectedRoute, scrollController),
            );
          },
        );
      },
    );
  }

  // Vue réduite (collapsed)
  Widget _buildCollapsedWazeBar(
    BuildContext context,
    CityFlowProvider provider,
    SmartRoute activeRoute,
    ScrollController scrollController,
  ) {
    return SingleChildScrollView(
      controller: scrollController,
      physics: const ClampingScrollPhysics(),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          if (_sheetController.isAttached) {
            _sheetController.animateTo(0.42, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
          }
        },
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Text(
                              '${activeRoute.durationMinutes} min',
                              style: const TextStyle(
                                color: Color(0xFF00C3FF),
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '${activeRoute.distanceKm} km',
                                style: const TextStyle(
                                  color: Color(0xFF475569),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          activeRoute.title,
                          style: const TextStyle(
                            color: Color(0xFF334155),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00C3FF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      elevation: 2,
                    ),
                    onPressed: () => _startLiveNavigation(provider),
                    icon: const Icon(Icons.navigation_rounded, size: 15, color: Colors.white),
                    label: const Text(
                      'Y aller',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Vue déployée (expanded)
  Widget _buildExpandedWazeSheet(
    BuildContext context,
    CityFlowProvider provider,
    List<SmartRoute> routes,
    SmartRoute? selectedRoute,
    ScrollController scrollController,
  ) {
    return Column(
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            if (_sheetController.isAttached) {
              _sheetController.animateTo(0.12, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
            }
          },
          child: Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 6),
            child: Center(
              child: Container(
                width: 40,
                height: 4.5,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2.5),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        '${routes.length} itinéraires calculés',
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Routes Secondaires',
                        style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {
                  if (_sheetController.isAttached) {
                    _sheetController.animateTo(0.12, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Carte',
                        style: TextStyle(color: Color(0xFF475569), fontSize: 11.5, fontWeight: FontWeight.w700),
                      ),
                      SizedBox(width: 2),
                      Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF475569), size: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),

        Expanded(
          child: ListView.separated(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            itemCount: routes.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (ctx, idx) {
              final route = routes[idx];
              final isSelected = route.id == selectedRoute?.id;
              final isSecondary = route.type != 'fastest';

              return GestureDetector(
                onTap: () {
                  provider.selectSmartRoute(route);
                  _fitRouteBounds(route.coordinates);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFF0F9FF) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? const Color(0xFF00C3FF) : const Color(0xFFE2E8F0),
                      width: isSelected ? 1.8 : 1.0,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isSelected)
                        Container(
                          width: 4,
                          height: 75,
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00C3FF),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                    decoration: BoxDecoration(
                                      color: isSecondary
                                          ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                          : const Color(0xFF0284C7).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          isSecondary ? Icons.alt_route_rounded : Icons.route_rounded,
                                          size: 12,
                                          color: isSecondary ? const Color(0xFF10B981) : const Color(0xFF0284C7),
                                        ),
                                        const SizedBox(width: 4),
                                        Flexible(
                                          child: Text(
                                            route.roadCategory,
                                            style: TextStyle(
                                              color: isSecondary ? const Color(0xFF10B981) : const Color(0xFF0284C7),
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w800,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                if (route.timeSavedVsMainMinutes > 0) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '⚡ +${route.timeSavedVsMainMinutes} min',
                                      style: const TextStyle(
                                        color: Color(0xFFD97706),
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${route.durationMinutes} min',
                                  style: TextStyle(
                                    color: isSelected ? const Color(0xFF00C3FF) : const Color(0xFF0F172A),
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                Text(
                                  '${route.distanceKm} km',
                                  style: const TextStyle(
                                    color: Color(0xFF64748B),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              route.title,
                              style: TextStyle(
                                color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF334155),
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 5),
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: Text(
                                    '🛣️ Note : ${route.practicabilityScore}/10',
                                    style: const TextStyle(color: Color(0xFF334155), fontSize: 10.5, fontWeight: FontWeight.w700),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF0F9FF),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: Text(
                                    '🌧️ Pluie : ${route.rainPracticabilityScore}/10',
                                    style: const TextStyle(color: Color(0xFF0284C7), fontSize: 10.5, fontWeight: FontWeight.w700),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(5),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Text(
                                    route.roadSurfaceType,
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.w600),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    isSelected ? 'Itinéraire optimisé • Trafic calculé' : 'Variante de contournement disponible',
                                    style: const TextStyle(
                                      color: Color(0xFF64748B),
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => _showStepsModal(context, route),
                                  child: const Padding(
                                    padding: EdgeInsets.only(left: 6),
                                    child: Text(
                                      'Étapes',
                                      style: TextStyle(
                                        color: Color(0xFF0284C7),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            _buildTrafficFluidityBar(route),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Barre d'actions fixes inférieure : [ Partir plus tard ] & [ Y aller ]
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF1F5F9),
                    foregroundColor: const Color(0xFF0284C7),
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => TripPlannerScreen(onNavigateTab: widget.onNavigateTab)),
                    );
                  },
                  child: const Text(
                    'Partir plus tard',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: Color(0xFF0284C7),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00C3FF), // Waze Cyan
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    elevation: 2,
                  ),
                  onPressed: () => _startLiveNavigation(provider),
                  child: const Text(
                    'Y aller',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTrafficFluidityBar(SmartRoute route) {
    if (route.trafficSegments.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Container(
              height: 5,
              color: const Color(0xFF10B981),
            ),
          ),
          const SizedBox(height: 5),
          const Row(
            children: [
              Icon(Icons.circle, color: Color(0xFF10B981), size: 7),
              SizedBox(width: 4),
              Text(
                '100% Fluide • Circulation optimale',
                style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      );
    }

    final totalCoords = route.trafficSegments.fold<int>(0, (sum, seg) => sum + (seg.coordinates.isNotEmpty ? seg.coordinates.length : 1));
    if (totalCoords == 0) return const SizedBox.shrink();

    int fluidCount = 0;
    int moderateCount = 0;
    int heavyCount = 0;

    for (final seg in route.trafficSegments) {
      final len = seg.coordinates.isNotEmpty ? seg.coordinates.length : 1;
      if (seg.status == 'fluid' || seg.congestionPercent < 30) {
        fluidCount += len;
      } else if (seg.status == 'moderate' || seg.congestionPercent < 60) {
        moderateCount += len;
      } else {
        heavyCount += len;
      }
    }

    final fluidPct = ((fluidCount / totalCoords) * 100).round();
    final modPct = ((moderateCount / totalCoords) * 100).round();
    final heavyPct = ((heavyCount / totalCoords) * 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: SizedBox(
            height: 5,
            child: Row(
              children: route.trafficSegments.map((seg) {
                final flex = seg.coordinates.isNotEmpty ? seg.coordinates.length : 1;
                return Expanded(
                  flex: flex,
                  child: Container(
                    color: seg.color,
                    margin: const EdgeInsets.symmetric(horizontal: 0.5),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        const SizedBox(height: 5),
        Wrap(
          spacing: 8,
          runSpacing: 2,
          children: [
            if (fluidPct > 0)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text('$fluidPct% Fluide', style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              ),
            if (modPct > 0)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text('$modPct% Ralenti', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              ),
            if (heavyPct > 0)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text('$heavyPct% Bouchon', style: const TextStyle(color: Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              ),
          ],
        ),
      ],
    );
  }

  void _showAvoidOptionsModal(BuildContext context, CityFlowProvider provider) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E2024),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Options d\'itinéraire (Éviter)',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeTrackColor: const Color(0xFF00C3FF),
                title: const Text('Éviter les péages (Tolls)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Péage autoroute / ponts payants', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                value: _avoidTolls,
                onChanged: (val) {
                  setState(() => _avoidTolls = val);
                  setModalState(() {});
                },
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeTrackColor: const Color(0xFF00C3FF),
                title: const Text('Éviter les routes non goudronnées', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Pistes en terre et nids-de-poule', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                value: _avoidUnpaved,
                onChanged: (val) {
                  setState(() => _avoidUnpaved = val);
                  setModalState(() {});
                },
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeTrackColor: const Color(0xFF00C3FF),
                title: const Text('Éviter les zones inondables', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Chaussées submergées en saison des pluies', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                value: _avoidFlooded,
                onChanged: (val) {
                  setState(() => _avoidFlooded = val);
                  setModalState(() {});
                },
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00C3FF),
                  foregroundColor: Colors.black,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  provider.fetchSmartRoutes(
                    origin: _departureCoords ?? _selectedDeparture,
                    destination: _destinationCoords ?? _selectedDestination,
                  );
                },
                child: const Text('Appliquer les filtres', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showStepsModal(BuildContext context, SmartRoute route) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Étapes de l\'itinéraire',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.navy),
                ),
                IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const Divider(),
            Expanded(
              child: ListView.builder(
                itemCount: route.steps.length,
                itemBuilder: (ctx, idx) {
                  final step = route.steps[idx];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFFF1F5F9),
                      child: Icon(_getManeuverIcon(step.maneuverIcon), color: AppColors.navy, size: 18),
                    ),
                    title: Text(step.instruction, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    subtitle: Text(step.distance, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==============================================================
  // ÉTAPE 4 : ACTIVE NAVIGATION HUD (GUIDAGE GPS EN DIRECT WAZE)
  // ==============================================================

  Widget _buildActiveNavigationHud(BuildContext context, CityFlowProvider provider, SmartRoute? route) {
    if (route == null || route.steps.isEmpty) {
      return const SizedBox.shrink();
    }

    final stepIndex = provider.navStepIndex;
    final currentStep = route.steps[stepIndex.clamp(0, route.steps.length - 1)];
    final nextStep = (stepIndex + 1 < route.steps.length) ? route.steps[stepIndex + 1] : null;
    final isCompleted = provider.navCompleted;

    final navPos = provider.currentNavPosition;

    // Radar d'alerte de proximité Waze
    var upcomingAlertTitle = '';
    var upcomingAlertDist = 0;
    for (final alert in provider.currentCityAlerts) {
      final d = const Distance().as(LengthUnit.Meter, navPos, alert.position);
      if (d < 450 && d > 20) {
        upcomingAlertTitle = alert.title;
        upcomingAlertDist = d.round();
        break;
      }
    }

    final isOverSpeed = provider.navSpeedKmh > 50.0;

    return Positioned.fill(
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 1. BANNIÈRE SUPÉRIEURE NOIRE WAZE (#000000)
          // SANS bouton son 🔊, SANS bouton musique 🎵
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF000000), // Noir Waze Signature
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.5),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Statut GPS en jaune
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Color(0xFFFBBF24),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Signal GPS capté',
                              style: TextStyle(
                                color: Color(0xFFFBBF24),
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            // Flèche Blanche de Manœuvre
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Icon(
                                _getManeuverIcon(currentStep.maneuverIcon),
                                color: Colors.white,
                                size: 38,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Distance en grand (ex: 110 m)
                                  Text(
                                    isCompleted ? 'Arrivée !' : provider.navNextManeuverDistanceLabel,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 26,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  // Rue / Instruction
                                  Text(
                                    isCompleted ? 'Vous êtes arrivé à destination.' : currentStep.instruction,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Sous-bannière : Prochaine manœuvre ("puis ↰ dans ...")
                  if (nextStep != null && !isCompleted) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E2024),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Text('puis ', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                          Icon(_getManeuverIcon(nextStep.maneuverIcon), color: Colors.white, size: 16),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              nextStep.instruction,
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // ALERTE HORS-ITINÉRAIRE & PROPOSITIONS D'ITINÉRAIRES ALTERNATIFS EN DIRECT
                  if (provider.isOffRoute && !isCompleted) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF991B1B), Color(0xFFDC2626)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF87171), width: 1.5),
                        boxShadow: const [
                          BoxShadow(color: Colors.black45, blurRadius: 12, offset: Offset(0, 4)),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.wrong_location_rounded, color: Color(0xFFDC2626), size: 18),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Hors itinéraire prévu',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    Text(
                                      'Écart détecté : ~${provider.distanceToRouteMeters.round()} m',
                                      style: const TextStyle(
                                        color: Color(0xFFFEE2E2),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (provider.isRecalculatingOffRoute) ...[
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                ),
                                const SizedBox(width: 6),
                              ],
                              IconButton(
                                icon: const Icon(Icons.refresh_rounded, color: Colors.white, size: 20),
                                tooltip: 'Recalculer depuis ma position',
                                onPressed: () => provider.recalculateOffRouteRoutes(),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                                onPressed: () => provider.dismissOffRouteAlert(),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ],
                          ),
                          if (provider.isRecalculatingOffRoute) ...[
                            const SizedBox(height: 6),
                            const Text(
                              'Calcul de nouveaux itinéraires depuis votre position actuelle...',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontStyle: FontStyle.italic),
                            ),
                          ] else if (provider.offRouteAlternatives.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            const Text(
                              'Itinéraires alternatifs proposés :',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            ...provider.offRouteAlternatives.take(3).map((altRoute) {
                              return Container(
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.25),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: Colors.white24,
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            altRoute.title,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 12,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          Text(
                                            '${altRoute.durationMinutes} min • ${altRoute.distanceKm.toStringAsFixed(1)} km',
                                            style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ),
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF10B981),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        minimumSize: Size.zero,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      onPressed: () {
                                        provider.acceptAlternativeRoute(altRoute);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Nouvel itinéraire appliqué ! Reprise du guidage.'),
                                            backgroundColor: Color(0xFF10B981),
                                          ),
                                        );
                                      },
                                      child: const Text('Suivre', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ],
                      ),
                    ),
                  ],

                  // RADAR D'ALERTE DE PROXIMITÉ WAZE
                  if (upcomingAlertTitle.isNotEmpty && !isCompleted) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF78350F),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
                        boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 4))],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle),
                            child: const Icon(Icons.warning_amber_rounded, color: Colors.black, size: 18),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Dans $upcomingAlertDist m : $upcomingAlertTitle',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const Text(
                                  'Signalé par la communauté • Toujours là ?',
                                  style: TextStyle(color: Color(0xFFFDE68A), fontSize: 10, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Signalement confirmé (+5 pts).'), backgroundColor: Color(0xFF10B981)),
                              );
                            },
                            style: TextButton.styleFrom(
                              backgroundColor: const Color(0xFFF59E0B),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              minimumSize: Size.zero,
                            ),
                            child: const Text('Confirmer', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // PROPOSITION DE DÉVIATION DYNAMIQUE
                  if (provider.hasDetourAlert && !isCompleted) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1E3A8A), Color(0xFF0284C7)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF38BDF8), width: 1.5),
                        boxShadow: const [
                          BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 4)),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(
                                  color: Color(0xFF38BDF8),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.alt_route_rounded, color: Colors.white, size: 18),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Gain estimé : -${provider.detourTimeSavedMinutes ?? 4} min',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                                onPressed: () => provider.dismissDetourAlert(),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            provider.detourReason ?? 'Itinéraire alternatif plus rapide trouvé.',
                            style: const TextStyle(
                              color: Color(0xFFE0F2FE),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  onPressed: () {
                                    provider.acceptDetourRoute();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Itinéraire mis à jour ! Navigation recalculée.'),
                                        backgroundColor: Color(0xFF10B981),
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.check_rounded, size: 16),
                                  label: const Text('Accepter la déviation', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                                ),
                              ),
                              const SizedBox(width: 8),
                              TextButton(
                                onPressed: () => provider.dismissDetourAlert(),
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.white70,
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                ),
                                child: const Text('Ignorer', style: TextStyle(fontSize: 11)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // 2. COMPTEUR DE VITESSE CIRCULAIRE NOIR WAZE (EN BAS À GAUCHE)
          Positioned(
            bottom: 125,
            left: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isOverSpeed ? const Color(0xFFEF4444) : const Color(0xFF1E2024), // Noir Waze
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 8)],
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${provider.navSpeedKmh.round()}',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          const Text(
                            'km/h',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.white70,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Panneau Limite de Vitesse (50 km/h)
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFEF4444), width: 3.5),
                        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                      ),
                      child: const Center(
                        child: Text(
                          '50',
                          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 3. BOUTONS FLOTTANTS DROITE (SIGNALEMENT WAZE ⚠️ & RECENTRER GPS)
          Positioned(
            bottom: 125,
            right: 16,
            child: Column(
              children: [
                // Bouton Jaune Signalement Communauté Waze
                FloatingActionButton(
                  heroTag: 'btn_waze_report_nav',
                  backgroundColor: const Color(0xFFFBBF24),
                  foregroundColor: const Color(0xFF0F172A),
                  elevation: 4,
                  onPressed: () => _showCommunityReportModal(context, provider),
                  child: const Icon(Icons.warning_amber_rounded, size: 28),
                ),
                const SizedBox(height: 10),
                // Recentrer sur le véhicule
                FloatingActionButton.small(
                  heroTag: 'btn_recenter_nav',
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF007AFF),
                  elevation: 3,
                  onPressed: () {
                    _mapController.move(navPos, 17.0);
                  },
                  child: const Icon(Icons.gps_fixed_rounded, size: 20),
                ),
              ],
            ),
          ),

          // 4. BARRE INFÉRIEURE BLANCHE WAZE (HEURE 8:23, TEMPS RESTANT, CONTRÔLES)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 18,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Heure d'arrivée en grand (ex: 8:23)
                            Text(
                              _getEstimatedArrivalTime(provider.navRemainingMinutes),
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            // Temps restant & distance (ex: 18 min • 6,3 km)
                            Row(
                              children: [
                                Text(
                                  '${provider.navRemainingMinutes} min',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF10B981)),
                                ),
                                const Text(
                                  ' • ',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8)),
                                ),
                                Text(
                                  '${provider.navRemainingDistanceKm} km',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          // Bouton Test Simulation Déviation Hors-Itinéraire
                          IconButton.filledTonal(
                            style: IconButton.styleFrom(
                              backgroundColor: provider.isOffRoute ? const Color(0xFFFEE2E2) : const Color(0xFFF1F5F9),
                              foregroundColor: provider.isOffRoute ? const Color(0xFFDC2626) : AppColors.textSecondary,
                            ),
                            tooltip: 'Simuler déviation hors itinéraire',
                            onPressed: () {
                              provider.simulateOffRouteDeviation();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Déviation simulée : véhicule sorti de la route.'),
                                  backgroundColor: Color(0xFFDC2626),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            },
                            icon: const Icon(Icons.alt_route_rounded),
                          ),
                          const SizedBox(width: 8),
                          // Toggle Simulation Auto / GPS Réel
                          IconButton.filledTonal(
                            style: IconButton.styleFrom(
                              backgroundColor: provider.isNavAutoSimulating ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                              foregroundColor: provider.isNavAutoSimulating ? const Color(0xFF16A34A) : AppColors.textSecondary,
                            ),
                            tooltip: provider.isNavAutoSimulating ? 'Simulation active' : 'GPS Réel',
                            onPressed: () => provider.toggleNavAutoSimulation(),
                            icon: Icon(provider.isNavAutoSimulating ? Icons.auto_mode_rounded : Icons.gps_fixed_rounded),
                          ),
                          const SizedBox(width: 8),
                          // Bouton Quitter / Terminer
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isCompleted ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                            ),
                            onPressed: () => _exitNavigation(provider),
                            child: Text(isCompleted ? 'Terminer' : 'Quitter', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==============================================================
  // TIROIR MODE SECOURS / ONDE VERTE
  // ==============================================================

  Widget _buildEmergencyDrawer(BuildContext context, CityFlowProvider provider) {
    final activeMission = provider.activeEmergencyMission;

    return Positioned(
      left: 16,
      right: 16,
      bottom: 20,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 20, offset: Offset(0, 6))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(color: Color(0xFFDC2626), shape: BoxShape.circle),
                        child: const Icon(Icons.emergency_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 10),
                      const Flexible(
                        child: Text(
                          'Mode Secours & Onde Verte',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => setState(() => _isEmergencyPanelOpen = false),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (activeMission != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '🔴 MISSION EN COURS : ${activeMission.vehicleName}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Corridor : ${activeMission.corridorName} • Vitesse : ${activeMission.speedKmh} km/h',
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  final sm = ScaffoldMessenger.of(context);
                  await provider.cancelEmergency();
                  if (mounted) {
                    setState(() {});
                    provider.speakInstruction('Mission d\'urgence arrêtée.');
                    sm.showSnackBar(
                      SnackBar(
                        content: const Text('Mission d\'urgence arrêtée avec succès.'),
                        backgroundColor: const Color(0xFF475569),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.stop_rounded),
                label: const Text('Arrêter la mission', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ] else ...[
              const Text(
                'Déclencher un corridor prioritaire pour véhicule d\'urgence :',
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () async {
                        final sm = ScaffoldMessenger.of(context);
                        await provider.dispatchEmergency(vehicleType: 'Ambulance SAMU');
                        if (mounted) {
                          setState(() {});
                          final mission = provider.activeEmergencyMission;
                          if (mission != null && mission.coordinates.isNotEmpty) {
                            _fitRouteBounds(mission.coordinates);
                          }
                          provider.speakInstruction('Mission d\'urgence activée pour Ambulance SAMU. Corridor prioritaire et onde verte synchronisés.');
                          sm.showSnackBar(
                            SnackBar(
                              content: Row(
                                children: const [
                                  Icon(Icons.medical_services_rounded, color: Colors.white),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Corridor prioritaire activé pour Ambulance SAMU ! Onde verte synchronisée.',
                                      style: TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              backgroundColor: const Color(0xFFDC2626),
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.medical_services_rounded, size: 18),
                      label: const Text('Ambulance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD97706),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () async {
                        final sm = ScaffoldMessenger.of(context);
                        await provider.dispatchEmergency(vehicleType: 'Sapeurs-Pompiers');
                        if (mounted) {
                          setState(() {});
                          final mission = provider.activeEmergencyMission;
                          if (mission != null && mission.coordinates.isNotEmpty) {
                            _fitRouteBounds(mission.coordinates);
                          }
                          provider.speakInstruction('Mission d\'urgence activée pour Sapeurs-Pompiers. Corridor prioritaire et onde verte synchronisés.');
                          sm.showSnackBar(
                            SnackBar(
                              content: Row(
                                children: const [
                                  Icon(Icons.fire_truck_rounded, color: Colors.white),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Corridor prioritaire activé pour Sapeurs-Pompiers ! Onde verte synchronisée.',
                                      style: TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              backgroundColor: const Color(0xFFEA580C),
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.fire_truck_rounded, size: 18),
                      label: const Text('Pompiers', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ==============================================================
  // HELPERS & FORMATAGE
  // ==============================================================

  IconData _getManeuverIcon(String? iconKey) {
    switch (iconKey) {
      case 'arrow-up-right':
      case 'right':
        return Icons.turn_right_rounded;
      case 'arrow-up-left':
      case 'left':
        return Icons.turn_left_rounded;
      case 'straight':
        return Icons.straight_rounded;
      case 'roundabout':
        return Icons.roundabout_right_rounded;
      case 'traffic-light':
        return Icons.traffic_rounded;
      case 'map-pin':
      case 'arrive':
        return Icons.location_on_rounded;
      default:
        return Icons.navigation_rounded;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'hospital':
        return Icons.local_hospital_rounded;
      case 'transport':
        return Icons.flight_takeoff_rounded;
      case 'mall':
        return Icons.shopping_bag_rounded;
      case 'hotel':
        return Icons.hotel_rounded;
      case 'university':
        return Icons.school_rounded;
      default:
        return Icons.location_city_rounded;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'hospital':
        return const Color(0xFFEF4444);
      case 'transport':
        return const Color(0xFF0284C7);
      case 'mall':
        return const Color(0xFFF59E0B);
      case 'hotel':
        return const Color(0xFF8B5CF6);
      case 'university':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF00875A);
    }
  }

  String _getCategoryLabel(String category) {
    switch (category) {
      case 'hospital':
        return 'Hôpital';
      case 'transport':
        return 'Gare / Aéroport';
      case 'mall':
        return 'Marché / Commerce';
      case 'hotel':
        return 'Hôtel';
      case 'university':
        return 'Université';
      default:
        return 'Carrefour';
    }
  }

  String _getEstimatedArrivalTime(int durationMinutes) {
    final eta = DateTime.now().add(Duration(minutes: durationMinutes));
    final hour = eta.hour.toString().padLeft(2, '0');
    final min = eta.minute.toString().padLeft(2, '0');
    return '$hour:$min';
  }
}



// BOTTOM SHEET DE RECHERCHE STYLE GOOGLE MAPS / WAZE
class _GoogleMapsSearchModal extends StatefulWidget {
  final bool isDeparture;
  final String currentSelection;
  final String selectedCity;
  final LatLng? userGpsPosition;
  final List<CityLandmark> landmarks;
  final Function(CityLandmark) onSelectLandmark;
  final Function(LatLng) onSelectGpsPosition;

  const _GoogleMapsSearchModal({
    required this.isDeparture,
    required this.currentSelection,
    required this.selectedCity,
    required this.userGpsPosition,
    required this.landmarks,
    required this.onSelectLandmark,
    required this.onSelectGpsPosition,
  });

  @override
  State<_GoogleMapsSearchModal> createState() => _GoogleMapsSearchModalState();
}

class _GoogleMapsSearchModalState extends State<_GoogleMapsSearchModal> {
  String _searchQuery = '';
  String _activeCategory = 'all';
  late final TextEditingController _textController;
  Timer? _debounceTimer;
  bool _isSearching = false;
  List<CityLandmark> _liveSearchResults = [];

  final Map<String, String> _categories = const {
    'all': 'Tous les lieux',
    'landmark': 'Carrefours & Ronds-points',
    'mall': 'Marchés & Commerces',
    'hospital': 'Hôpitaux & Cliniques',
    'transport': 'Gares & Aéroports',
    'university': 'Universités & Campus',
  };

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController();
    _liveSearchResults = widget.landmarks;
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _textController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    setState(() => _searchQuery = query);
    _debounceTimer?.cancel();

    if (query.trim().isEmpty) {
      setState(() {
        _isSearching = false;
        _liveSearchResults = widget.landmarks;
      });
      return;
    }

    final localMatches = widget.landmarks.where((l) {
      final q = query.trim().toLowerCase();
      return l.name.toLowerCase().contains(q) ||
          l.district.toLowerCase().contains(q) ||
          l.desc.toLowerCase().contains(q);
    }).toList();

    setState(() {
      _liveSearchResults = localMatches;
      _isSearching = true;
    });

    _debounceTimer = Timer(const Duration(milliseconds: 320), () async {
      final dynamicResults = await CityFlowMobileApiService.searchPlaces(
        query: query,
        city: widget.selectedCity,
        userPos: widget.userGpsPosition,
      );

      if (mounted && _searchQuery == query) {
        setState(() {
          _liveSearchResults = dynamicResults;
          _isSearching = false;
        });
      }
    });
  }

  double? _calculateDistanceTo(LatLng point) {
    if (widget.userGpsPosition == null) return null;
    final dLat = (point.latitude - widget.userGpsPosition!.latitude).abs() * 111.0;
    final dLng = (point.longitude - widget.userGpsPosition!.longitude).abs() * 111.0;
    return double.parse(sqrt(dLat * dLat + dLng * dLng).toStringAsFixed(1));
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'hospital':
        return const Color(0xFFEF4444);
      case 'transport':
        return const Color(0xFF0284C7);
      case 'mall':
        return const Color(0xFFF59E0B);
      case 'hotel':
        return const Color(0xFF8B5CF6);
      case 'university':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF00875A);
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'hospital':
        return Icons.local_hospital_rounded;
      case 'transport':
        return Icons.flight_takeoff_rounded;
      case 'mall':
        return Icons.shopping_bag_rounded;
      case 'hotel':
        return Icons.hotel_rounded;
      case 'university':
        return Icons.school_rounded;
      default:
        return Icons.location_city_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredLandmarks = _liveSearchResults.where((l) {
      final matchesCat = _activeCategory == 'all' || l.category == _activeCategory;
      return matchesCat;
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 6),
            child: Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              widget.isDeparture ? 'Point de départ' : 'Destination',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: AppColors.navy,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              widget.selectedCity,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 22, color: AppColors.textSecondary),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _textController,
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText: 'Rechercher une rue, un carrefour, un hôpital...',
                    prefixIcon: _isSearching
                        ? const Padding(
                            padding: EdgeInsets.all(12.0),
                            child: SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                            ),
                          )
                        : const Icon(Icons.search_rounded, color: AppColors.primary),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            onPressed: () {
                              _textController.clear();
                              _onSearchChanged('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: _onSearchChanged,
                ),
              ],
            ),
          ),
          SizedBox(
            height: 38,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _categories.keys.length,
              separatorBuilder: (_, _) => const SizedBox(width: 6),
              itemBuilder: (ctx, idx) {
                final catKey = _categories.keys.elementAt(idx);
                final catLabel = _categories[catKey]!;
                final isSelected = _activeCategory == catKey;

                return GestureDetector(
                  onTap: () => setState(() => _activeCategory = catKey),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        catLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                          color: isSelected ? Colors.white : AppColors.navy,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const Divider(height: 16),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                      color: Color(0xFFDCFCE7),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.my_location_rounded, color: Color(0xFF16A34A), size: 20),
                  ),
                  title: const Text(
                    'Ma position actuelle (GPS en direct)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF16A34A)),
                  ),
                  subtitle: Text(
                    widget.userGpsPosition != null
                        ? 'Position GPS captée (${widget.userGpsPosition!.latitude.toStringAsFixed(4)}, ${widget.userGpsPosition!.longitude.toStringAsFixed(4)})'
                        : 'Utiliser la géolocalisation de l\'appareil',
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
                  onTap: () {
                    final pos = widget.userGpsPosition ??
                        (widget.selectedCity == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter);
                    widget.onSelectGpsPosition(pos);
                  },
                ),
                const Divider(height: 12),
                if (filteredLandmarks.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Column(
                      children: [
                        const Icon(Icons.search_off_rounded, size: 40, color: AppColors.textSecondary),
                        const SizedBox(height: 8),
                        Text(
                          'Aucun lieu trouvé pour "$_searchQuery"',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.navy),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Essayez avec un autre nom de quartier, carrefour ou avenue.',
                          style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                else
                  ...filteredLandmarks.map((landmark) {
                    final catColor = _getCategoryColor(landmark.category);
                    final dist = _calculateDistanceTo(landmark.pos);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: catColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(_getCategoryIcon(landmark.category), color: catColor, size: 20),
                        ),
                        title: Row(
                          children: [
                            Expanded(
                              child: Text(
                                landmark.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (dist != null) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE2E8F0),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Text(
                                  '$dist km',
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                ),
                              ),
                            ],
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                landmark.district,
                                style: const TextStyle(fontSize: 9, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        subtitle: Text(
                          landmark.desc,
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => widget.onSelectLandmark(landmark),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
