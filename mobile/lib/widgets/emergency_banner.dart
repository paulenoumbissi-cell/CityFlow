import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';

class EmergencyBanner extends StatelessWidget {
  const EmergencyBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final activeRoute = provider.activePriorityRoute;
    final activeMission = provider.activeEmergencyMission;

    if (!provider.isEmergencyModeActive && activeMission == null && activeRoute == null) {
      return const SizedBox.shrink();
    }

    final isFirefighter = activeMission?.vehicleType == 'firefighters';
    final vehicleName = activeMission?.vehicleName ?? (activeRoute?.emergencyType.label ?? 'Véhicule d\'Urgence');
    final corridorName = activeMission?.corridorName ?? (activeRoute?.corridorDescription ?? 'Corridor Prioritaire');
    final timeSaved = activeMission?.timeSavedMinutes ?? (activeRoute?.timeSavedMinutes ?? 15);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isFirefighter
              ? [const Color(0xFFEA580C), const Color(0xFFC2410C)]
              : [const Color(0xFFDC2626), const Color(0xFF991B1B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (isFirefighter ? const Color(0xFFEA580C) : const Color(0xFFDC2626)).withValues(alpha: 0.45),
            blurRadius: 16,
            spreadRadius: 1,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isFirefighter ? Icons.fire_truck_rounded : Icons.medical_services_rounded,
                  color: isFirefighter ? const Color(0xFFEA580C) : const Color(0xFFDC2626),
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          '🚨 MODE URGENCE : PRIORITÉ ABSOLUE',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.95),
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '-$timeSaved min (-35%)',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 10.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$vehicleName • $corridorName',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                onPressed: () {
                  if (activeMission != null) {
                    provider.cancelEmergency();
                  } else {
                    provider.toggleEmergencyMode(false);
                  }
                },
                tooltip: 'Fermer l\'alerte urgence',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.amberAccent, size: 14),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'ALERTE USAGERS : Libérez la voie à droite. Feux synchronisés sur onde verte.',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
