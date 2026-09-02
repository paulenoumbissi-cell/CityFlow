import 'package:flutter/material.dart';
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

class _PriorityRoutingScreenState extends State<PriorityRoutingScreen> {
  EmergencyType _selectedType = EmergencyType.ambulance;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final routes = provider.currentCityPriorityRoutes;
    final isEmergencyActive = provider.isEmergencyModeActive;
    final activeRoute = provider.activePriorityRoute;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Itinéraires Prioritaires'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: CitySelector(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Emergency type selector chips
          const Text(
            'Type de Véhicule Prioritaire',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: EmergencyType.values.map((type) {
                final isSelected = _selectedType == type;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    avatar: Icon(
                      type.icon,
                      size: 16,
                      color: isSelected ? Colors.white : type.color,
                    ),
                    label: Text(type.label),
                    selected: isSelected,
                    selectedColor: type.color,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      fontSize: 12,
                    ),
                    backgroundColor: AppColors.surfaceLight,
                    onSelected: (val) {
                      setState(() {
                        _selectedType = type;
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 20),

          // Active Emergency Status if engaged
          if (isEmergencyActive && activeRoute != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: AppColors.emergencyGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.emergency.withValues(alpha: 0.35),
                    blurRadius: 15,
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
                          const Icon(Icons.emergency_rounded, color: Colors.white, size: 24),
                          const SizedBox(width: 8),
                          Text(
                            'COULOIR ACTIF EN DIRECT',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.95),
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        onPressed: () => provider.toggleEmergencyMode(false),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.emergency,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        child: const Text('Stopper', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Gain de temps estimé : ${activeRoute.timeSavedMinutes} minutes',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Onde verte et délestage appliqués le long du corridor.',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Available Priority Corridors List
          const Text(
            'Corridors Stratégiques Disponibles',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          ...routes.map((route) {
            final isCurrentActive = isEmergencyActive && activeRoute?.id == route.id;

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isCurrentActive ? AppColors.emergency : AppColors.cardBorder,
                  width: isCurrentActive ? 2 : 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Origin -> Destination
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          const Icon(Icons.circle, color: AppColors.primary, size: 12),
                          Container(width: 2, height: 24, color: AppColors.cardBorder),
                          const Icon(Icons.location_on_rounded, color: AppColors.emergency, size: 16),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              route.originName,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              route.destinationName,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Time Saved Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.trafficFluid.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.trafficFluid.withValues(alpha: 0.4)),
                        ),
                        child: Column(
                          children: [
                            Text(
                              '-${route.timeSavedMinutes} min',
                              style: const TextStyle(
                                color: AppColors.trafficFluid,
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                              ),
                            ),
                            const Text(
                              'Gain IA',
                              style: TextStyle(color: AppColors.trafficFluid, fontSize: 9),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Metrics Summary
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildDurationItem(
                          label: 'Trafic Classique',
                          value: '${route.standardDurationMinutes} min',
                          color: AppColors.trafficHeavy,
                        ),
                        Container(width: 1, height: 28, color: AppColors.cardBorder),
                        _buildDurationItem(
                          label: 'Prioritaire CityFlow',
                          value: '${route.priorityDurationMinutes} min',
                          color: AppColors.primary,
                        ),
                        Container(width: 1, height: 28, color: AppColors.cardBorder),
                        _buildDurationItem(
                          label: 'Distance',
                          value: '${route.distanceKm} km',
                          color: AppColors.textPrimary,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Corridor notes
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline_rounded, color: AppColors.textMuted, size: 15),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          route.corridorDescription,
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        provider.selectPriorityRoute(route);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Couloir prioritaire activé vers ${route.destinationName} !'),
                            backgroundColor: AppColors.emergency,
                          ),
                        );
                        widget.onNavigateTab?.call(0); // Basculer vers la carte
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isCurrentActive ? AppColors.emergency : AppColors.primary,
                      ),
                      icon: Icon(
                        isCurrentActive ? Icons.check_circle_rounded : Icons.flash_on_rounded,
                        size: 18,
                      ),
                      label: Text(
                        isCurrentActive ? 'Couloir Actif (Voir sur Carte)' : 'Activer Couloir Prioritaire',
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildDurationItem({
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w800,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}
