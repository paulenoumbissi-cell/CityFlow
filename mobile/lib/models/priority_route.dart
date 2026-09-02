import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum EmergencyType {
  ambulance('Ambulance / Médical', Icons.local_hospital_rounded, Color(0xFFFF3366)),
  firefighters('Sapeurs-Pompiers', Icons.local_fire_department_rounded, Color(0xFFFF6B00)),
  police('Forces de Sécurité', Icons.local_police_rounded, Color(0xFF3B82F6)),
  vipConvoy('Convoi Officiel', Icons.directions_car_filled_rounded, Color(0xFF8B5CF6));

  final String label;
  final IconData icon;
  final Color color;
  const EmergencyType(this.label, this.icon, this.color);
}

class PriorityCheckpoint {
  final String name;
  final LatLng position;
  final String actionRequired; // ex: "Passage feu vert prioritaire", "Délestage voie de droite"
  final bool isCleared;

  const PriorityCheckpoint({
    required this.name,
    required this.position,
    required this.actionRequired,
    this.isCleared = false,
  });
}

class PriorityRoute {
  final String id;
  final String originName;
  final LatLng originPosition;
  final String destinationName;
  final LatLng destinationPosition;
  final EmergencyType emergencyType;
  final double distanceKm;
  final int standardDurationMinutes;
  final int priorityDurationMinutes;
  final int timeSavedMinutes;
  final List<LatLng> waypoints;
  final List<PriorityCheckpoint> checkpoints;
  final String corridorDescription;

  const PriorityRoute({
    required this.id,
    required this.originName,
    required this.originPosition,
    required this.destinationName,
    required this.destinationPosition,
    required this.emergencyType,
    required this.distanceKm,
    required this.standardDurationMinutes,
    required this.priorityDurationMinutes,
    required this.timeSavedMinutes,
    required this.waypoints,
    required this.checkpoints,
    required this.corridorDescription,
  });
}
