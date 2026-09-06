import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum AlertSeverity {
  critical('Critique (Blocage total)', Color(0xFFDC2626)),
  high('Élevé (Fort ralentissement)', Color(0xFFF59E0B)),
  moderate('Modéré (Attention)', Color(0xFF3B82F6));

  final String label;
  final Color color;
  const AlertSeverity(this.label, this.color);
}

enum AlertCategory {
  accident('Accident de circulation', Icons.car_crash_rounded),
  flood('Inondation / Chaussée submergée', Icons.water_drop_rounded),
  flooding('Inondation / Chaussée submergée', Icons.water_drop_rounded),
  breakdown('Camion / Véhicule en panne', Icons.build_rounded),
  roadwork('Travaux sur la chaussée', Icons.construction_rounded),
  roadworks('Travaux sur la chaussée', Icons.construction_rounded),
  trafficBlock('Carrefour anarchique / Bloqué', Icons.traffic_rounded);

  final String label;
  final IconData icon;
  const AlertCategory(this.label, this.icon);
}

class IncidentAlert {
  final String id;
  final String title;
  final String city; // Yaoundé ou Douala
  final String locationDescription;
  final LatLng position;
  final AlertSeverity severity;
  final AlertCategory category;
  final DateTime reportedAt;
  final int confirmationsCount;
  final bool isVerifiedByAuthority;
  final bool isRead;

  const IncidentAlert({
    required this.id,
    required this.title,
    required this.city,
    required this.locationDescription,
    required this.position,
    required this.severity,
    required this.category,
    required this.reportedAt,
    this.confirmationsCount = 1,
    this.isVerifiedByAuthority = false,
    this.isRead = false,
  });

  IncidentAlert copyWith({
    String? id,
    String? title,
    String? city,
    String? locationDescription,
    LatLng? position,
    AlertSeverity? severity,
    AlertCategory? category,
    DateTime? reportedAt,
    int? confirmationsCount,
    bool? isVerifiedByAuthority,
    bool? isRead,
  }) {
    return IncidentAlert(
      id: id ?? this.id,
      title: title ?? this.title,
      city: city ?? this.city,
      locationDescription: locationDescription ?? this.locationDescription,
      position: position ?? this.position,
      severity: severity ?? this.severity,
      category: category ?? this.category,
      reportedAt: reportedAt ?? this.reportedAt,
      confirmationsCount: confirmationsCount ?? this.confirmationsCount,
      isVerifiedByAuthority: isVerifiedByAuthority ?? this.isVerifiedByAuthority,
      isRead: isRead ?? this.isRead,
    );
  }
}
