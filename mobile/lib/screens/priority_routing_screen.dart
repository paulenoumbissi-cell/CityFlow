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
    final activeMission = provider.activeEmergencyMission;
    final isMissionActive = activeMission != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Mode Secours & Onde Verte'),
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
                      ElevatedButton(
                        onPressed: () => provider.cancelEmergency(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFFDC2626),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Stopper', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Corridor : ${activeMission.corridorName}',
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Vitesse : ${activeMission.speedKmh} km/h • Gain estimé : -${activeMission.timeSavedMinutes} min',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // TIMELINE DES FEUX ASSERVIS
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Feux Tricolores Synchronisés',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      Text(
                        'Cascade Verte',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...activeMission.intersections.map((intLight) {
                    final isCleared = intLight.state == 'cleared';
                    final isGreenWave = intLight.state == 'green_wave';

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: isCleared
                                  ? const Color(0xFFE2E8F0)
                                  : isGreenWave
                                      ? const Color(0xFFD1FAE5)
                                      : const Color(0xFFFEF3C7),
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              isCleared ? '✓' : isGreenWave ? '🟢' : '⏳',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  intLight.name,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isGreenWave ? FontWeight.bold : FontWeight.w500,
                                    color: isCleared ? AppColors.textMuted : AppColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  isCleared
                                      ? 'Carrefour franchi'
                                      : isGreenWave
                                          ? 'Feu vert forcé • Transversale bloquée 🔴'
                                          : 'En attente d\'approche',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isGreenWave ? const Color(0xFF059669) : AppColors.textMuted,
                                    fontWeight: isGreenWave ? FontWeight.bold : FontWeight.normal,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.play_arrow_rounded, color: Colors.white),
                      label: const Text(
                        'Avancer au carrefour suivant ▶',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                      onPressed: () => provider.stepEmergency(),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ALERTE BROADCAST AUTOMOBILISTES
            if (activeMission.broadcastAlert != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1F2),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFECDD3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.volume_up_rounded, color: Color(0xFFBE123C), size: 24),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Alerte Broadcast Conducteurs (Rayon 2.5 km)',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFBE123C)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            activeMission.broadcastAlert!.message,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 20),
          ] else ...[
            // 2. SÉLECTION D'UNITÉ D'URGENCE (SI PAS DE MISSION ACTIVE)
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

            // 3. LISTE DES CORRIDORS STRATÉGIQUES DISPONIBLES
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
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.cardBorder),
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
                                'Gain Onde Verte',
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
                            label: 'Prioritaire Onde Verte',
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

                    // Action Button : Enclencher l'onde verte
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final vehicleTypeStr = _selectedType == EmergencyType.firefighters
                              ? 'firefighters'
                              : _selectedType == EmergencyType.police
                                  ? 'police'
                                  : _selectedType == EmergencyType.vipConvoy
                                      ? 'convoy'
                                      : 'ambulance';

                          final ok = await provider.dispatchEmergency(
                            vehicleType: vehicleTypeStr,
                            corridorId: route.id,
                            origin: route.originName,
                            destination: route.destinationName,
                          );

                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(ok
                                    ? '🚨 Onde verte enclenchée vers ${route.destinationName} !'
                                    : 'Mode secours local activé.'),
                                backgroundColor: AppColors.emergency,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.emergency,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.flash_on_rounded, size: 18, color: Colors.white),
                        label: const Text(
                          'ENCLENCHER L\'ONDE VERTE PRIORITAIRE',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
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
