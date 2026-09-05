import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/traffic_node.dart';
import '../models/saved_place.dart';
import '../models/community_driver.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/city_data.dart';
import '../widgets/pulsing_traffic_marker.dart';
import '../widgets/cityflow_drawer.dart';
import 'saved_places_screen.dart';

class MapScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const MapScreen({super.key, this.onNavigateTab});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final MapController _mapController = MapController();
  TrafficNode? _highlightedNode;
  CityLandmark? _selectedLandmark;
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

  void _openSearchModal(BuildContext context, CityFlowProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _GoogleMapsSearchModal(
        selectedCity: provider.selectedCity,
        userGpsPosition: provider.userRealPosition,
        landmarks: provider.currentCityLandmarks,
        onSelectLandmark: (landmark) {
          setState(() {
            _selectedLandmark = landmark;
          });
          Navigator.pop(ctx);
          _mapController.move(landmark.pos, 15.5);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final nodes = provider.currentNodes;
    final landmarks = provider.currentCityLandmarks;
    final userPos = provider.userRealPosition ?? provider.currentCityCenter;
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
      key: _scaffoldKey,
      drawer: CityFlowDrawer(onNavigateTab: widget.onNavigateTab),
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // =========================================================
          // 1. CARTE PLEIN ÉCRAN FLUTTER MAP (STYLE WAZE ÉPURÉ)
          // =========================================================
          Positioned.fill(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: provider.currentCityCenter,
                initialZoom: 14.5,
                minZoom: 9.0,
                maxZoom: 18.5,
                onMapReady: () {
                  setState(() => _isMapReady = true);
                },
                onTap: (tapPosition, point) {
                  if (_highlightedNode != null || _selectedLandmark != null) {
                    setState(() {
                      _highlightedNode = null;
                      _selectedLandmark = null;
                    });
                  }
                },
              ),
              children: [
                // Tuiles OpenStreetMap Standard
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'cm.cityflow.mobile',
                ),

                // Tronçons de routes colorés selon le trafic en direct
                PolylineLayer(
                  polylines: [
                    ...nodes.where((n) => n.connectedSegments.isNotEmpty).map(
                      (n) => Polyline(
                        points: n.connectedSegments,
                        strokeWidth: 5.5,
                        color: _getCongestionColor(n.currentCongestion).withValues(alpha: 0.85),
                      ),
                    ),
                    // Couloir prioritaire Mode Secours
                    if (provider.isEmergencyModeActive && activeRoute != null) ...[
                      Polyline(
                        points: activeRoute.waypoints,
                        strokeWidth: 9.0,
                        color: AppColors.emergency.withValues(alpha: 0.4),
                      ),
                      Polyline(
                        points: activeRoute.waypoints,
                        strokeWidth: 5.0,
                        color: AppColors.priorityRoute,
                      ),
                    ],
                  ],
                ),

                // Calque de Marqueurs (Position Véhicule Waze, Info Véhicule, Trafic)
                MarkerLayer(
                  markers: [
                    // Position GPS utilisateur avec Cône/Flèche Cyan & Badge "Infos véhicule ▾"
                    Marker(
                      point: userPos,
                      width: 140,
                      height: 100,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // 1. Halo et Flèche Cyan Waze
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFF00C3FF).withValues(alpha: 0.25),
                                ),
                              ),
                              Container(
                                width: 28,
                                height: 28,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black26,
                                      blurRadius: 6,
                                      offset: Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.navigation_rounded,
                                    color: Color(0xFF00C3FF),
                                    size: 20,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),

                          // 2. Pastille Cyan "Infos véhicule ▾" (Identique capture Waze)
                          GestureDetector(
                            onTap: () => _showVehicleInfoModal(context, provider),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF0099FF), Color(0xFF00D2FF)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Colors.black26,
                                    blurRadius: 6,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Infos véhicule',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                  SizedBox(width: 2),
                                  Icon(Icons.arrow_drop_down_rounded, color: Colors.white, size: 16),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Marqueurs de Carrefours & Nœuds de Trafic
                    ...nodes.map((node) {
                      final isSelected = _highlightedNode?.id == node.id;
                      return Marker(
                        point: node.position,
                        width: 54,
                        height: 54,
                        child: PulsingTrafficMarker(
                          node: node,
                          isSelected: isSelected,
                          onTap: () {
                            setState(() {
                              _highlightedNode = node;
                              _selectedLandmark = null;
                            });
                            provider.selectNode(node);
                            _mapController.move(node.position, 15.0);
                          },
                        ),
                      );
                    }),

                    // Marqueurs de Lieux d'intérêts
                    ...landmarks.map((l) {
                      final isSelected = _selectedLandmark?.id == l.id;
                      final color = _getCategoryColor(l.category);
                      return Marker(
                        point: l.pos,
                        width: isSelected ? 44 : 34,
                        height: isSelected ? 44 : 34,
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedLandmark = l;
                              _highlightedNode = null;
                            });
                            _mapController.move(l.pos, 15.5);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            decoration: BoxDecoration(
                              color: isSelected ? color : Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: isSelected ? Colors.white : color, width: isSelected ? 3 : 2),
                              boxShadow: [
                                BoxShadow(
                                  color: color.withValues(alpha: isSelected ? 0.45 : 0.2),
                                  blurRadius: isSelected ? 8 : 4,
                                ),
                              ],
                            ),
                            child: Center(
                              child: Icon(
                                _getCategoryIcon(l.category),
                                color: isSelected ? Colors.white : color,
                                size: isSelected ? 20 : 16,
                              ),
                            ),
                          ),
                        ),
                      );
                    }),

                    // Marqueurs des Véhicules Connectés CityFlow (Style Pro Épuré)
                    ...provider.nearbyCommunityDrivers.map((driver) {
                      final icon = _getDriverIcon(driver.mood);
                      final color = _getDriverColor(driver.mood);
                      return Marker(
                        point: driver.position,
                        width: 36,
                        height: 36,
                        child: GestureDetector(
                          onTap: () => _showDriverDetailsModal(context, driver),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: color.withValues(alpha: 0.35),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                              border: Border.all(color: color, width: 2),
                            ),
                            child: Center(
                              child: Icon(icon, color: color, size: 18),
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ],
            ),
          ),

          // =========================================================
          // 2. EN-TÊTE SUPÉRIEUR STYLE WAZE (MENU GAUCHE & BOUTONS DROITE)
          // =========================================================
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // BOUTON MENU HAMBURGER GAUCHE [ ☰ ]
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 10,
                          offset: Offset(0, 3),
                        ),
                      ],
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.menu_rounded, color: Color(0xFF1E2024), size: 24),
                      tooltip: 'Menu CityFlow',
                      onPressed: () => _scaffoldKey.currentState?.openDrawer(),
                    ),
                  ),

                  // PILE DES BOUTONS DROITE (MUSIQUE & GUIDAGE AUDIO)
                  Column(
                    children: [
                      // Bouton Musique / Radio
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black12,
                              blurRadius: 10,
                              offset: Offset(0, 3),
                            ),
                          ],
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.music_note_rounded, color: Color(0xFF1E2024), size: 22),
                          tooltip: 'Radio & Médias',
                          onPressed: () => _showMediaSheet(context),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Bouton Haut-Parleur / Volume
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black12,
                              blurRadius: 10,
                              offset: Offset(0, 3),
                            ),
                          ],
                        ),
                        child: IconButton(
                          icon: Icon(
                            provider.voiceGuidanceEnabled ? Icons.volume_up_rounded : Icons.volume_off_rounded,
                            color: provider.voiceGuidanceEnabled ? const Color(0xFF1E2024) : const Color(0xFF94A3B8),
                            size: 22,
                          ),
                          tooltip: 'Guidage vocal',
                          onPressed: () => provider.toggleVoiceGuidance(),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // =========================================================
          // 3. BOUTONS FLOTTANTS DU BAS (COMPTEUR VITESSE & BOUTON DANGER JAUNE)
          // =========================================================
          Positioned(
            left: 16,
            bottom: _selectedLandmark != null || _highlightedNode != null ? 220 : 255,
            child: Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                color: const Color(0xFF1E2024), // Fond sombre Waze
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF334155), width: 2),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black38,
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${provider.navSpeedKmh.round()}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      height: 1.0,
                    ),
                  ),
                  const Text(
                    'km/h',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // BOUTON DANGER / SIGNALEMENT CITOYEN JAUNE WAZE [ ⚠️ + ]
          Positioned(
            right: 16,
            bottom: _selectedLandmark != null || _highlightedNode != null ? 220 : 255,
            child: GestureDetector(
              onTap: () => _showQuickCitizenReportSheet(context, provider),
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE033), // Jaune vif Waze
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 12,
                      offset: Offset(0, 5),
                    ),
                  ],
                ),
                child: Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFD500),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.black, width: 2),
                        ),
                        child: const Icon(
                          Icons.add_rounded,
                          color: Colors.black,
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // =========================================================
          // 4. TIROIR INFÉRIEUR STYLE WAZE ("Où va-t-on ?", Domicile, Travail, Récents)
          // =========================================================
          if (_selectedLandmark != null)
            _buildSelectedLandmarkCard(context, provider, _selectedLandmark!)
          else if (_highlightedNode != null)
            _buildTrafficNodeCard(context, provider, _highlightedNode!)
          else
            _buildWazeHomeBottomSheet(context, provider),
        ],
      ),
    );
  }

  // TIROIR INFÉRIEUR ACCUEIL WAZE HAUTE FIDÉLITÉ
  Widget _buildWazeHomeBottomSheet(BuildContext context, CityFlowProvider provider) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 20,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Poignée de glissement
            Center(
              child: Container(
                width: 44,
                height: 4.5,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // BARRE DE RECHERCHE WAZE : [ 🔍 Où va-t-on ?     🎤 ]
            GestureDetector(
              onTap: () => _openSearchModal(context, provider),
              child: Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9), // Gris doux Waze
                  borderRadius: BorderRadius.circular(26),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 24),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Où va-t-on ?',
                        style: TextStyle(
                          color: Color(0xFF334155),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Icon(Icons.mic_rounded, color: Color(0xFF1E2024), size: 22),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // LIGNE DES LIEUX FAVORIS WAZE : [ 🏠 Domicile ]  [ 💼 Travail ]  [ ➕ Nouveau ]
            Row(
              children: [
                // Domicile
                Expanded(
                  child: _buildFavoriteCard(
                    iconText: '🏠',
                    label: 'Domicile',
                    onTap: () {
                      final dom = provider.savedPlaces.firstWhere(
                        (p) => p.category == SavedPlaceCategory.home,
                        orElse: () => provider.savedPlaces.first,
                      );
                      provider.fetchSmartRoutes(
                        origin: provider.userRealPosition ?? provider.currentCityCenter,
                        destination: dom.position,
                      );
                      widget.onNavigateTab?.call(1);
                    },
                  ),
                ),
                const SizedBox(width: 10),

                // Travail
                Expanded(
                  child: _buildFavoriteCard(
                    iconText: '💼',
                    label: 'Travail',
                    onTap: () {
                      final work = provider.savedPlaces.firstWhere(
                        (p) => p.category == SavedPlaceCategory.work,
                        orElse: () => provider.savedPlaces.length > 1 ? provider.savedPlaces[1] : provider.savedPlaces.first,
                      );
                      provider.fetchSmartRoutes(
                        origin: provider.userRealPosition ?? provider.currentCityCenter,
                        destination: work.position,
                      );
                      widget.onNavigateTab?.call(1);
                    },
                  ),
                ),
                const SizedBox(width: 10),

                // Nouveau
                Expanded(
                  child: _buildFavoriteCard(
                    iconData: Icons.add_rounded,
                    label: 'Nouveau',
                    isAddAction: true,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => SavedPlacesScreen(onNavigateTab: widget.onNavigateTab)),
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // SECTION RÉCEMMENT
            const Text(
              'Récemment',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),

            // Liste des destinations récentes
            _buildRecentDestinationItem(
              title: 'Pharmacie Siloe',
              address: 'Avenue Kennedy, Yaoundé, Centre Region',
              onTap: () {
                final target = provider.currentCityLandmarks.first.pos;
                provider.fetchSmartRoutes(
                  origin: provider.userRealPosition ?? provider.currentCityCenter,
                  destination: target,
                );
                widget.onNavigateTab?.call(1);
              },
            ),
            _buildRecentDestinationItem(
              title: 'Bastos (Ambassades)',
              address: 'Quartier Bastos, Yaoundé',
              onTap: () {
                final bastos = CityData.findLandmark(provider.selectedCity, 'Bastos (Ambassades)')?.pos ?? provider.currentCityCenter;
                provider.fetchSmartRoutes(
                  origin: provider.userRealPosition ?? provider.currentCityCenter,
                  destination: bastos,
                );
                widget.onNavigateTab?.call(1);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFavoriteCard({
    String? iconText,
    IconData? iconData,
    required String label,
    required VoidCallback onTap,
    bool isAddAction = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (iconText != null)
              Text(iconText, style: const TextStyle(fontSize: 16))
            else if (iconData != null)
              Icon(iconData, color: isAddAction ? const Color(0xFF0284C7) : const Color(0xFF1E2024), size: 18),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: isAddAction ? const Color(0xFF0284C7) : const Color(0xFF1E2024),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentDestinationItem({
    required String title,
    required String address,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.history_rounded, color: Color(0xFF64748B), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Color(0xFF1E2024),
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    address,
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // FICHE DE LIEU SÉLECTIONNÉ AVEC BOUTON ITINÉRAIRE
  Widget _buildSelectedLandmarkCard(BuildContext context, CityFlowProvider provider, CityLandmark landmark) {
    final catColor = _getCategoryColor(landmark.category);
    return Positioned(
      left: 16,
      right: 16,
      bottom: 24,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.cardBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: catColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(_getCategoryIcon(landmark.category), color: catColor, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          landmark.name,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
                        ),
                        Text(
                          '${landmark.district} • ${_getCategoryLabel(landmark.category)}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.textSecondary),
                  onPressed: () => setState(() => _selectedLandmark = null),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              landmark.desc,
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF006666),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 3,
                    ),
                    onPressed: () {
                      provider.fetchSmartRoutes(
                        origin: provider.userRealPosition ?? provider.currentCityCenter,
                        destination: landmark.pos,
                      );
                      widget.onNavigateTab?.call(1); // Aller sur Itinéraires
                    },
                    icon: const Icon(Icons.directions_rounded, size: 20),
                    label: const Text('Itinéraire', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // FICHE DE NOEUD DE TRAFIC
  Widget _buildTrafficNodeCard(BuildContext context, CityFlowProvider provider, TrafficNode node) {
    final statusColor = _getCongestionColor(node.currentCongestion);
    return Positioned(
      left: 16,
      right: 16,
      bottom: 24,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.cardBorder),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 16, offset: Offset(0, 6))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(node.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.navy)),
                IconButton(icon: const Icon(Icons.close_rounded, size: 18), onPressed: () => setState(() => _highlightedNode = null)),
              ],
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                  child: Text(node.currentCongestion.name.toUpperCase(), style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11)),
                ),
                const SizedBox(width: 10),
                Text('${node.averageSpeedKmh} km/h • Retard : +${node.estimatedDelayMinutes} min', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(42),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                provider.fetchSmartRoutes(origin: provider.userRealPosition ?? provider.currentCityCenter, destination: node.position);
                widget.onNavigateTab?.call(1);
              },
              icon: const Icon(Icons.alt_route_rounded, size: 18),
              label: const Text('Éviter ou Calculer l\'Itinéraire', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  // MODAL DÉTAILS DU CONDUCTEUR CONNECTÉ
  void _showDriverDetailsModal(BuildContext context, CommunityDriver driver) {
    final icon = _getDriverIcon(driver.mood);
    final color = _getDriverColor(driver.mood);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF1E2024),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFF334155)),
          boxShadow: const [
            BoxShadow(
              color: Colors.black54,
              blurRadius: 20,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2),
                  ),
                  child: Center(
                    child: Icon(
                      icon,
                      color: color,
                      size: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            driver.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00875A).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFF10B981), width: 0.8),
                            ),
                            child: const Text(
                              'EN ROUTE',
                              style: TextStyle(
                                color: Color(0xFF10B981),
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${driver.rank} • ${driver.points} pts',
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white54, size: 20),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.speed_rounded, color: Color(0xFF38BDF8), size: 18),
                      const SizedBox(width: 6),
                      Text(
                        '${driver.speedKmh.toInt()} km/h',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  Container(width: 1, height: 20, color: Colors.white24),
                  Row(
                    children: [
                      const Icon(Icons.shield_outlined, color: Color(0xFFFBBF24), size: 18),
                      const SizedBox(width: 6),
                      Text(
                        driver.rank,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00C3FF),
                      foregroundColor: const Color(0xFF0F172A),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Signal de courtoisie transmis à ${driver.name}.'),
                          backgroundColor: const Color(0xFF00875A),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                    icon: const Icon(Icons.sensors_rounded, size: 18),
                    label: const Text(
                      'Saluer',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Color(0xFF334155)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Remerciement transmis à ${driver.name} (+5 pts).'),
                          backgroundColor: const Color(0xFF10B981),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                    icon: const Icon(Icons.thumb_up_alt_rounded, size: 18, color: Color(0xFF10B981)),
                    label: const Text(
                      'Remercier',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // MODAL INFOS VÉHICULE WAZE
  void _showVehicleInfoModal(BuildContext context, CityFlowProvider provider) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.directions_car_rounded, color: Color(0xFF0099FF), size: 24),
                    SizedBox(width: 10),
                    Text('Informations Véhicule', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF1E2024))),
                  ],
                ),
                IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const Divider(),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(backgroundColor: Color(0xFFE0F2FE), child: Icon(Icons.eco_rounded, color: Color(0xFF0284C7))),
              title: Text('Mode de conduite IA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: Text('CityFlow Eco-Traffic activé (-25% carburant)', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(backgroundColor: Color(0xFFDCFCE7), child: Icon(Icons.speed_rounded, color: Color(0xFF16A34A))),
              title: Text('Vitesse moyenne actuelle : ${provider.averageSpeed.toStringAsFixed(0)} km/h', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: Text('Régulation active à ${provider.selectedCity}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ),
          ],
        ),
      ),
    );
  }

  // MODAL RADIO & MÉDIAS
  void _showMediaSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.radio_rounded, color: Color(0xFF0099FF), size: 24),
                    SizedBox(width: 10),
                    Text('Radio & Infos Trafic Direct', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF1E2024))),
                  ],
                ),
                IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const Divider(),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(backgroundColor: Color(0xFFE0F2FE), child: Icon(Icons.podcasts_rounded, color: Color(0xFF0284C7))),
              title: Text('Flash Info-Trafic CityFlow (FM 98.5)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: Text('Points noirs et axes délestés en direct', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              trailing: Icon(Icons.play_circle_fill_rounded, color: Color(0xFF0284C7), size: 36),
            ),
          ],
        ),
      ),
    );
  }

  // MODAL SIGNALEMENT CITOYEN RAPIDE (BOUTON JAUNE WAZE)
  void _showQuickCitizenReportSheet(BuildContext context, CityFlowProvider provider) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 26),
                    SizedBox(width: 10),
                    Text('Signaler un incident (+15 pts)', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF1E2024))),
                  ],
                ),
                IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _buildReportTypeButton(ctx, provider, 'Accident', Icons.car_crash_rounded, const Color(0xFFEF4444)),
                _buildReportTypeButton(ctx, provider, 'Bouchon', Icons.traffic_rounded, const Color(0xFFF59E0B)),
                _buildReportTypeButton(ctx, provider, 'Travaux', Icons.construction_rounded, const Color(0xFF3B82F6)),
                _buildReportTypeButton(ctx, provider, 'Danger', Icons.warning_rounded, const Color(0xFFDC2626)),
                _buildReportTypeButton(ctx, provider, 'Nid de poule', Icons.remove_road_rounded, const Color(0xFF8B5CF6)),
                _buildReportTypeButton(ctx, provider, 'Inondation', Icons.water_damage_rounded, const Color(0xFF0284C7)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportTypeButton(BuildContext ctx, CityFlowProvider provider, String label, IconData icon, Color color) {
    return GestureDetector(
      onTap: () async {
        Navigator.pop(ctx);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Signalement "$label" envoyé ! +15 points citoyen gagnés.'),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
      },
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
          ],
        ),
      ),
    );
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
      case 'restaurant':
        return Icons.restaurant_rounded;
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
      case 'restaurant':
        return const Color(0xFFEA580C);
      case 'university':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF00875A);
    }
  }

  IconData _getDriverIcon(String mood) {
    switch (mood) {
      case 'taxi':
        return Icons.local_taxi_rounded;
      case 'eco':
        return Icons.eco_rounded;
      case 'speedy':
        return Icons.bolt_rounded;
      case 'sos':
        return Icons.emergency_rounded;
      default:
        return Icons.directions_car_rounded;
    }
  }

  Color _getDriverColor(String mood) {
    switch (mood) {
      case 'taxi':
        return const Color(0xFFD97706);
      case 'eco':
        return const Color(0xFF059669);
      case 'speedy':
        return const Color(0xFF0284C7);
      case 'sos':
        return const Color(0xFFDC2626);
      default:
        return const Color(0xFF2563EB);
    }
  }

  String _getCategoryLabel(String category) {
    switch (category) {
      case 'hospital':
        return 'Hôpital';
      case 'transport':
        return 'Gare / Aéroport';
      case 'mall':
        return 'Marché / Mall';
      case 'hotel':
        return 'Hôtel';
      case 'restaurant':
        return 'Restaurant';
      case 'university':
        return 'Université';
      default:
        return 'Carrefour';
    }
  }
}

// MODAL DE RECHERCHE GOOGLE MAPS POUR LA PAGE D'ACCUEIL
class _GoogleMapsSearchModal extends StatefulWidget {
  final String selectedCity;
  final LatLng? userGpsPosition;
  final List<CityLandmark> landmarks;
  final Function(CityLandmark) onSelectLandmark;

  const _GoogleMapsSearchModal({
    required this.selectedCity,
    required this.userGpsPosition,
    required this.landmarks,
    required this.onSelectLandmark,
  });

  @override
  State<_GoogleMapsSearchModal> createState() => _GoogleMapsSearchModalState();
}

class _GoogleMapsSearchModalState extends State<_GoogleMapsSearchModal> {
  String _searchQuery = '';
  final TextEditingController _textController = TextEditingController();

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filteredLandmarks = widget.landmarks.where((l) {
      return _searchQuery.isEmpty ||
          l.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          l.district.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          l.desc.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: TextField(
              controller: _textController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Rechercher un carrefour, hôpital, restaurant...',
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF006666)),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.clear_rounded), onPressed: () => setState(() { _textController.clear(); _searchQuery = ''; }))
                    : null,
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filteredLandmarks.length,
              itemBuilder: (ctx, idx) {
                final l = filteredLandmarks[idx];
                return ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFF1F5F9),
                    child: Icon(Icons.location_on_rounded, color: Color(0xFF006666), size: 20),
                  ),
                  title: Text(l.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy)),
                  subtitle: Text('${l.district} • ${l.desc}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary), maxLines: 1),
                  onTap: () => widget.onSelectLandmark(l),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
