import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/traffic_node.dart';
import '../core/constants/app_colors.dart';
import '../widgets/city_selector.dart';
import '../widgets/emergency_banner.dart';
import '../widgets/node_detail_sheet.dart';

class MapScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const MapScreen({super.key, this.onNavigateTab});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  TrafficNode? _highlightedNode;
  bool _isMapReady = false;
  String? _lastCity;

  Color _getCongestionColor(CongestionLevel level) {
    switch (level) {
      case CongestionLevel.fluid:
        return AppColors.trafficFluid;
      case CongestionLevel.moderate:
        return AppColors.trafficModerate;
      case CongestionLevel.heavy:
        return AppColors.trafficHeavy;
      case CongestionLevel.jammed:
        return AppColors.trafficJam;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final nodes = provider.currentNodes;
    final activeRoute = provider.activePriorityRoute;

    // Déplacer la carte si l'utilisateur change de ville et que la carte est prête
    if (_isMapReady && _lastCity != null && _lastCity != provider.selectedCity) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _mapController.move(provider.currentCityCenter, 13.5);
        }
      });
    }
    _lastCity = provider.selectedCity;

    return Scaffold(
      body: Stack(
        children: [
          // Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: provider.currentCityCenter,
              initialZoom: 13.5,
              minZoom: 10.0,
              maxZoom: 18.0,
              onMapReady: () {
                setState(() {
                  _isMapReady = true;
                });
              },
              onTap: (tapPosition, point) {
                if (_highlightedNode != null) {
                  setState(() {
                    _highlightedNode = null;
                  });
                }
              },
            ),
            children: [
              // Official OpenStreetMap Tile Layer (100% Gratuit & Sans Clé API)
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.cityflow.mobile',
              ),

              // Road Segments Polyline Layer
              PolylineLayer(
                polylines: [
                  ...nodes.where((n) => n.connectedSegments.isNotEmpty).map(
                    (n) => Polyline(
                      points: n.connectedSegments,
                      strokeWidth: 5.0,
                      color: _getCongestionColor(n.currentCongestion).withValues(alpha: 0.8),
                    ),
                  ),
                  // Emergency priority route polyline
                  if (provider.isEmergencyModeActive && activeRoute != null) ...[
                    Polyline(
                      points: activeRoute.waypoints,
                      strokeWidth: 8.0,
                      color: AppColors.emergency.withValues(alpha: 0.4),
                    ),
                    Polyline(
                      points: activeRoute.waypoints,
                      strokeWidth: 4.5,
                      color: AppColors.priorityRoute,
                    ),
                  ],
                ],
              ),

              // Markers Layer
              MarkerLayer(
                markers: [
                  // Nodes markers
                  ...nodes.map((node) {
                    final color = _getCongestionColor(node.currentCongestion);
                    final isSelected = _highlightedNode?.id == node.id;

                    return Marker(
                      point: node.position,
                      width: isSelected ? 64 : 48,
                      height: isSelected ? 64 : 48,
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _highlightedNode = node;
                          });
                          provider.selectNode(node);
                          _mapController.move(node.position, 14.5);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.surface,
                            border: Border.all(
                              color: color,
                              width: isSelected ? 3.5 : 2.0,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: color.withValues(alpha: isSelected ? 0.6 : 0.35),
                                blurRadius: isSelected ? 16 : 8,
                                spreadRadius: isSelected ? 3 : 1,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.traffic_rounded,
                                  color: color,
                                  size: isSelected ? 22 : 16,
                                ),
                                Text(
                                  '${node.averageSpeedKmh.toInt()}',
                                  style: TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: isSelected ? 11 : 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),

                  // Live User GPS Location Marker
                  if (provider.userRealPosition != null)
                    Marker(
                      point: provider.userRealPosition!,
                      width: 50,
                      height: 50,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.secondary.withValues(alpha: 0.25),
                            ),
                          ),
                          Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.secondary,
                              border: Border.all(color: Colors.white, width: 3),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.secondary.withValues(alpha: 0.5),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Priority Waypoint & Checkpoint Markers
                  if (provider.isEmergencyModeActive && activeRoute != null) ...[
                    // Origin
                    Marker(
                      point: activeRoute.originPosition,
                      width: 44,
                      height: 44,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.emergency,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.emergency.withValues(alpha: 0.5),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.my_location_rounded, color: Colors.white, size: 22),
                      ),
                    ),
                    // Destination
                    Marker(
                      point: activeRoute.destinationPosition,
                      width: 44,
                      height: 44,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.5),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.local_hospital_rounded, color: AppColors.background, size: 22),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),

          // Top Floating Control Bar
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const CitySelector(),
                      // Live Simulation Indicator
                      GestureDetector(
                        onTap: () => provider.toggleLiveSimulation(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.surface.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: provider.isLiveSimulating ? AppColors.primary : AppColors.cardBorder,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: provider.isLiveSimulating ? AppColors.primary : AppColors.textMuted,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                provider.isLiveSimulating ? 'LIVE IA' : 'PAUSE',
                                style: TextStyle(
                                  color: provider.isLiveSimulating ? AppColors.primary : AppColors.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Emergency Banner if active
                const EmergencyBanner(),
              ],
            ),
          ),

          // Floating Action Buttons (Recenter, Emergency Shortcut)
          Positioned(
            right: 16,
            bottom: _highlightedNode != null ? 360 : 24,
            child: Column(
              children: [
                FloatingActionButton.small(
                  heroTag: 'emergency_btn',
                  backgroundColor: provider.isEmergencyModeActive ? AppColors.emergency : AppColors.surface,
                  foregroundColor: Colors.white,
                  onPressed: () {
                    if (provider.isEmergencyModeActive) {
                      provider.toggleEmergencyMode(false);
                    } else {
                      provider.toggleEmergencyMode(true);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Couloir prioritaire d\'urgence activé !'),
                          backgroundColor: AppColors.emergency,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                  tooltip: 'Mode Urgence / Couloir Prioritaire',
                  child: const Icon(Icons.flash_on_rounded),
                ),
                const SizedBox(height: 10),
                FloatingActionButton.small(
                  heroTag: 'recenter_btn',
                  backgroundColor: AppColors.surface,
                  foregroundColor: AppColors.primary,
                  onPressed: () {
                    _mapController.move(provider.currentCityCenter, 13.5);
                  },
                  tooltip: 'Recentrer la carte',
                  child: const Icon(Icons.my_location_rounded),
                ),
              ],
            ),
          ),

          // Bottom Node Detail Sheet
          if (_highlightedNode != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: NodeDetailSheet(
                node: _highlightedNode!,
                onClose: () {
                  setState(() {
                    _highlightedNode = null;
                  });
                },
                onAvoidRoute: () {
                  setState(() {
                    _highlightedNode = null;
                  });
                  widget.onNavigateTab?.call(1); // Aller sur l'onglet Itinéraires
                },
              ),
            ),
        ],
      ),
    );
  }
}
