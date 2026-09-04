import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/priority_route.dart';
import '../core/constants/app_colors.dart';
import '../widgets/city_selector.dart';

class PriorityRoutingScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const PriorityRoutingScreen({super.key, this.onNavigateTab});

  @override
  State<PriorityRoutingScreen> createState() => _PriorityRoutingScreenState();
}

class _PriorityRoutingScreenState extends State<PriorityRoutingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  EmergencyType _selectedType = EmergencyType.ambulance;

  final Map<String, List<String>> _cityLandmarks = {
    'Yaoundé': [
      'Poste Centrale',
      'Bastos',
      'Mvan (Gare)',
      'Nsam',
      'Nlongkak',
      'Mokolo',
      'Odza',
      'Ahala',
      'Hôpital Général',
      'Hôpital Central (CHU)',
    ],
    'Douala': [
      'Akwa',
      'Deido (Rond-point)',
      'Bonanjo',
      'Bonabéri',
      'Bépanda',
      'Bonamoussadi',
      'Logbessou',
      'Hôpital Laquintinie',
      'Hôpital Général de Douala',
      'Aéroport International',
    ],
  };

  late String _selectedDeparture;
  late String _selectedDestination;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _selectedDeparture = 'Mvan (Gare)';
    _selectedDestination = 'Bastos';
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _swapEndpoints(CityFlowProvider provider) {
    setState(() {
      final temp = _selectedDeparture;
      _selectedDeparture = _selectedDestination;
      _selectedDestination = temp;
    });
    provider.fetchSmartRoutes(origin: _selectedDeparture, destination: _selectedDestination);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final landmarks = _cityLandmarks[provider.selectedCity] ?? _cityLandmarks['Yaoundé']!;

    // Si les sélections actuelles n'appartiennent pas à la ville active
    if (!landmarks.contains(_selectedDeparture)) {
      _selectedDeparture = landmarks[2];
    }
    if (!landmarks.contains(_selectedDestination)) {
      _selectedDestination = landmarks[1];
    }

    final isMissionActive = provider.hasActiveEmergencyMission;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        titleSpacing: 16,
        title: const Text(
          'Itinéraires & Mobilité',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: CitySelector(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: [
            const Tab(
              icon: Icon(Icons.alt_route_rounded, size: 20),
              text: 'Itinéraires IA & Éco',
            ),
            Tab(
              icon: Icon(
                Icons.emergency_rounded,
                size: 20,
                color: isMissionActive ? AppColors.emergency : null,
              ),
              text: isMissionActive ? 'Secours (ACTIF 🟢)' : 'Mode Secours',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: ITINÉRAIRES MULTI-CRITÈRES & ÉCO-MOBILITÉ
          _buildSmartRoutingTab(context, provider, landmarks),

          // TAB 2: MODE SECOURS & ONDE VERTE
          _buildEmergencyGreenWaveTab(context, provider),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 1: ITINÉRAIRES IA & ÉCO-MOBILITÉ
  // -------------------------------------------------------------
  Widget _buildSmartRoutingTab(BuildContext context, CityFlowProvider provider, List<String> landmarks) {
    final routes = provider.smartRoutes;
    final selectedRoute = provider.selectedSmartRoute;
    final multimodal = provider.multimodalOptions;
    final isNavigating = provider.isGpsNavigating;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 1. SELECTEUR D'ORIGINE / DESTINATION AVEC BOUTON SWAP
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.cardBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.location_on, color: AppColors.primary, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _selectedDeparture,
                        items: landmarks
                            .map((l) => DropdownMenuItem(
                                  value: l,
                                  child: Text('Départ : $l', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                ))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedDeparture = val);
                            provider.fetchSmartRoutes(origin: val, destination: _selectedDestination);
                          }
                        },
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.swap_vert_rounded, color: AppColors.primary),
                    onPressed: () => _swapEndpoints(provider),
                  ),
                ],
              ),
              const Divider(height: 12),
              Row(
                children: [
                  const Icon(Icons.flag_rounded, color: AppColors.emergency, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _selectedDestination,
                        items: landmarks
                            .map((l) => DropdownMenuItem(
                                  value: l,
                                  child: Text('Arrivée : $l', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                ))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedDestination = val);
                            provider.fetchSmartRoutes(origin: _selectedDeparture, destination: val);
                          }
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // 2. COMPARATEUR MULTI-MODAL (Voiture, Moto-taxi, Taxi, Marche)
        if (multimodal.isNotEmpty) ...[
          SizedBox(
            height: 64,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: multimodal.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final m = multimodal[idx];
                final isActive = provider.activeTravelMode == m.mode;
                return GestureDetector(
                  onTap: () => provider.setActiveTravelMode(m.mode),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isActive ? AppColors.primaryLight : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isActive ? AppColors.primary : AppColors.cardBorder,
                        width: isActive ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          m.mode == 'mototaxi'
                              ? Icons.two_wheeler_rounded
                              : m.mode == 'taxi'
                                  ? Icons.directions_bus_rounded
                                  : m.mode == 'walking'
                                      ? Icons.directions_walk_rounded
                                      : Icons.directions_car_rounded,
                          color: isActive ? AppColors.primary : AppColors.navy,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              m.label,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isActive ? AppColors.primary : AppColors.navy,
                              ),
                            ),
                            Text(
                              '${m.durationMinutes} min • ${m.costLabel}',
                              style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 14),
        ],

        // 3. CARTE INTERACTIVE FLUTTER MAP
        Container(
          height: 220,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.cardBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: selectedRoute?.coordinates.isNotEmpty == true
                    ? selectedRoute!.coordinates.first
                    : provider.currentCityCenter,
                initialZoom: 13.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.cityflow.mobile',
                ),
                if (selectedRoute != null && selectedRoute.coordinates.isNotEmpty) ...[
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: selectedRoute.coordinates,
                        strokeWidth: 6.0,
                        color: selectedRoute.color,
                      ),
                    ],
                  ),
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: selectedRoute.coordinates.first,
                        width: 32,
                        height: 32,
                        child: const Icon(Icons.location_on, color: AppColors.primary, size: 30),
                      ),
                      Marker(
                        point: selectedRoute.coordinates.last,
                        width: 32,
                        height: 32,
                        child: const Icon(Icons.flag_rounded, color: AppColors.emergency, size: 30),
                      ),
                      if (isNavigating &&
                          provider.navStepIndex + 1 < selectedRoute.coordinates.length)
                        Marker(
                          point: selectedRoute.coordinates[provider.navStepIndex + 1],
                          width: 32,
                          height: 32,
                          child: const Icon(Icons.navigation_rounded, color: Color(0xFF2563EB), size: 28),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),

        const SizedBox(height: 14),

        // 4. BANDEAU NAVIGATION GPS HUD (SI ACTIF)
        if (isNavigating && selectedRoute != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.navy,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: AppColors.navy.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: !provider.navCompleted
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.navigation_rounded, color: Color(0xFF34D399), size: 16),
                              SizedBox(width: 6),
                              Text(
                                'GUIDAGE GPS ACTIF',
                                style: TextStyle(
                                  color: Color(0xFF34D399),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          GestureDetector(
                            onTap: () => provider.stopGpsNavigation(),
                            child: const Text(
                              'Quitter',
                              style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Étape ${provider.navStepIndex + 1}/${selectedRoute.steps.length} • ${selectedRoute.steps[provider.navStepIndex].distance}',
                        style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        selectedRoute.steps[provider.navStepIndex].instruction,
                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          minimumSize: const Size.fromHeight(40),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => provider.nextGpsStep(),
                        icon: const Icon(Icons.arrow_forward, color: Colors.white, size: 16),
                        label: const Text('Étape suivante', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 36),
                      const SizedBox(height: 6),
                      const Text(
                        'Arrivé à destination !',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        '+15 points éco-mobilité crédités sur votre profil.',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                      ),
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () => provider.stopGpsNavigation(),
                        child: const Text('Terminer', style: TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 14),
        ],

        // 5. LISTE DES 3 ITINÉRAIRES (Rapide, Éco-score, Sécurisé)
        const Text(
          'Itinéraires calculés par l\'IA',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.navy),
        ),
        const SizedBox(height: 10),

        if (provider.isSmartRouteLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          )
        else
          ...routes.map((route) {
            final isSelected = selectedRoute?.id == route.id;
            return GestureDetector(
              onTap: () => provider.selectSmartRoute(route),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFF0FDF4) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.cardBorder,
                    width: isSelected ? 1.8 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: route.color),
                          ),
                          child: Text(
                            route.badge,
                            style: TextStyle(color: route.color, fontWeight: FontWeight.w800, fontSize: 10),
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              '${route.durationMinutes} min',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
                            ),
                            const SizedBox(width: 4),
                            Text('(${route.distanceKm} km)', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      route.title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        if (route.delaySavedMinutes > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                            child: Text('-${route.delaySavedMinutes} min', style: const TextStyle(fontSize: 10, color: Color(0xFF92400E), fontWeight: FontWeight.bold)),
                          ),
                        if (route.co2SavedKg > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                            child: Text('-${route.co2SavedKg} kg CO₂', style: const TextStyle(fontSize: 10, color: Color(0xFF166534), fontWeight: FontWeight.bold)),
                          ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                          child: Text('Eco-Score ${route.ecoScore}', style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),

        if (selectedRoute != null && !isNavigating) ...[
          const SizedBox(height: 6),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 2,
            ),
            onPressed: () => provider.startGpsNavigation(),
            icon: const Icon(Icons.navigation_rounded),
            label: const Text(
              'Démarrer le guidage GPS pas-à-pas',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  // -------------------------------------------------------------
  // TAB 2: MODE SECOURS & ONDE VERTE
  // -------------------------------------------------------------
  Widget _buildEmergencyGreenWaveTab(BuildContext context, CityFlowProvider provider) {
    final routes = provider.currentCityPriorityRoutes;
    final activeMission = provider.activeEmergencyMission;
    final isMissionActive = activeMission != null;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 1. ACTIVE EMERGENCY BANNER & GREEN WAVE CONTROLLER (SI MISSION EN COURS)
        if (isMissionActive) ...[
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFDC2626), Color(0xFF991B1B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFDC2626).withValues(alpha: 0.4),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.emergency_rounded, color: Colors.white, size: 24),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'ONDE VERTE ACTIVE 🟢',
                                style: TextStyle(
                                  color: Color(0xFFDC2626),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              activeMission.vehicleName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                      onPressed: () => provider.cancelEmergency(),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Column(
                        children: [
                          const Text('TEMPS SAUVÉ', style: TextStyle(color: Colors.white70, fontSize: 10)),
                          Text(
                            '-${activeMission.timeSavedMinutes} min',
                            style: const TextStyle(color: Color(0xFF86EFAC), fontWeight: FontWeight.w900, fontSize: 16),
                          ),
                        ],
                      ),
                      Container(width: 1, height: 28, color: Colors.white24),
                      Column(
                        children: [
                          const Text('VITESSE CONVOI', style: TextStyle(color: Colors.white70, fontSize: 10)),
                          Text(
                            '${activeMission.speedKmh} km/h',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                          ),
                        ],
                      ),
                      Container(width: 1, height: 28, color: Colors.white24),
                      Column(
                        children: [
                          const Text('TRAJET', style: TextStyle(color: Colors.white70, fontSize: 10)),
                          Text(
                            '${activeMission.distanceKm} km',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // TIMELINE DES FEUX ASSERVIS
                const Text(
                  'ÉTAT DES CARREFOURS & FEUX TRICOLORES :',
                  style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),

                Column(
                  children: activeMission.intersections.map((intersection) {
                    final isGreen = intersection.state == 'green_wave';
                    final isCleared = intersection.state == 'cleared';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isGreen
                            ? const Color(0xFF15803D).withValues(alpha: 0.6)
                            : isCleared
                                ? Colors.white.withValues(alpha: 0.1)
                                : Colors.black.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isGreen ? const Color(0xFF86EFAC) : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isGreen
                                ? Icons.traffic_rounded
                                : isCleared
                                    ? Icons.check_circle_rounded
                                    : Icons.hourglass_top_rounded,
                            size: 16,
                            color: isGreen ? const Color(0xFF86EFAC) : Colors.white70,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              intersection.name,
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isGreen
                                  ? const Color(0xFF86EFAC)
                                  : isCleared
                                      ? Colors.white24
                                      : Colors.white10,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              isGreen
                                  ? 'FEU VERT FORCÉ 🟢'
                                  : isCleared
                                      ? 'FRANCHI ✅'
                                      : 'EN ATTENTE ⏳',
                              style: TextStyle(
                                color: isGreen ? const Color(0xFF14532D) : Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 12),

                // BOUTONS D'ACTION ONDE VERTE
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFFDC2626),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => provider.stepEmergency(),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        label: const Text('Carrefour Suivant (Avancer)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => provider.cancelEmergency(),
                      child: const Text('Clôturer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // 2. DISPATCH NOUVELLE MISSION D'URGENCE
        const Text(
          'Déclencher un Couloir d\'Urgence',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy),
        ),
        const SizedBox(height: 4),
        const Text(
          'Force le feu vert sur tout l\'axe pour le passage prioritaire des véhicules de secours.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 12),

        // SÉLECTEUR DE TYPE DE VÉHICULE
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildVehicleSelectorChip('ambulance', 'Ambulance SAMU 119', Icons.medical_services_rounded, const Color(0xFFEF4444)),
              const SizedBox(width: 8),
              _buildVehicleSelectorChip('firefighters', 'Pompiers 118', Icons.local_fire_department_rounded, const Color(0xFFEA580C)),
              const SizedBox(width: 8),
              _buildVehicleSelectorChip('police', 'Police 117', Icons.local_police_rounded, const Color(0xFF2563EB)),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // LISTE DES COULOIRS PRIORITAIRES
        ...routes.map((route) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'COULOIR PRIORITAIRE',
                        style: TextStyle(color: Color(0xFFDC2626), fontSize: 10, fontWeight: FontWeight.w800),
                      ),
                    ),
                    Text(
                      '${route.distanceKm} km',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '${route.originName} ➔ ${route.destinationName}',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 14, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      'Passage de ${route.standardDurationMinutes} min à ${route.priorityDurationMinutes} min (-${route.standardDurationMinutes - route.priorityDurationMinutes} min)',
                      style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(38),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    provider.dispatchEmergency(
                      vehicleType: _selectedType.name,
                      corridorId: route.id,
                      origin: route.originName,
                      destination: route.destinationName,
                    );
                  },
                  icon: const Icon(Icons.flash_on_rounded, size: 16),
                  label: const Text('Activer l\'Onde Verte 🟢', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildVehicleSelectorChip(String id, String label, IconData icon, Color color) {
    final isSelected = _selectedType.name == id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedType = EmergencyType.values.firstWhere((e) => e.name == id, orElse: () => EmergencyType.ambulance);
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? color : AppColors.cardBorder),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.navy,
                fontWeight: FontWeight.bold,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
