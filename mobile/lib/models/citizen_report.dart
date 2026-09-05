import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum CitizenReportCategory {
  trafficJam('Embouteillage', Icons.traffic_rounded, Color(0xFFFF9800)),
  police('Police & Radar', Icons.local_police_rounded, Color(0xFF2196F3)),
  accident('Accident', Icons.car_crash_rounded, Color(0xFFEF4444)),
  hazard('Danger & Obstacle', Icons.warning_amber_rounded, Color(0xFFFFC107)),
  roadworks('Travaux', Icons.construction_rounded, Color(0xFFFF5722)),
  closure('Route barrée', Icons.block_rounded, Color(0xFFDC2626)),
  flooding('Inondation', Icons.water_drop_rounded, Color(0xFF0284C7)),
  gasStation('Carburant', Icons.local_gas_station_rounded, Color(0xFF10B981)),
  breakdown('Véhicule en panne', Icons.build_rounded, Color(0xFFF59E0B)),
  other('Info citoyenne', Icons.chat_bubble_rounded, Color(0xFF8B5CF6));

  final String label;
  final IconData icon;
  final Color color;
  const CitizenReportCategory(this.label, this.icon, this.color);

  static CitizenReportCategory fromString(String? val) {
    switch (val?.toLowerCase()) {
      case 'police':
        return CitizenReportCategory.police;
      case 'trafficjam':
      case 'trafficblock':
        return CitizenReportCategory.trafficJam;
      case 'roadworks':
      case 'roadwork':
        return CitizenReportCategory.roadworks;
      case 'closure':
        return CitizenReportCategory.closure;
      case 'flooding':
      case 'flood':
        return CitizenReportCategory.flooding;
      case 'gasstation':
      case 'fuel':
        return CitizenReportCategory.gasStation;
      case 'breakdown':
        return CitizenReportCategory.breakdown;
      case 'hazard':
        return CitizenReportCategory.hazard;
      case 'other':
        return CitizenReportCategory.other;
      case 'accident':
      default:
        return CitizenReportCategory.accident;
    }
  }
}

enum CitizenReportSeverity {
  low('Faible', Color(0xFF10B981)),
  moderate('Modéré', Color(0xFF3B82F6)),
  high('Élevé', Color(0xFFF59E0B)),
  critical('Critique', Color(0xFFDC2626));

  final String label;
  final Color color;
  const CitizenReportSeverity(this.label, this.color);

  static CitizenReportSeverity fromString(String? val) {
    switch (val?.toLowerCase()) {
      case 'low':
        return CitizenReportSeverity.low;
      case 'high':
        return CitizenReportSeverity.high;
      case 'critical':
        return CitizenReportSeverity.critical;
      case 'moderate':
      default:
        return CitizenReportSeverity.moderate;
    }
  }
}

class CitizenReport {
  final String id;
  final String author;
  final String city;
  final CitizenReportCategory category;
  final String title;
  final String locationDescription;
  final LatLng position;
  final CitizenReportSeverity severity;
  final DateTime reportedAt;
  final int confirmationsCount;
  final int resolutionsCount;
  final bool isVerified;
  final String status;
  final List<String> upvotedBy;

  DateTime get createdAt => reportedAt;
  int get upvotes => confirmationsCount;
  int get downvotes => resolutionsCount;

  const CitizenReport({
    required this.id,
    required this.author,
    required this.city,
    required this.category,
    required this.title,
    required this.locationDescription,
    required this.position,
    required this.severity,
    required this.reportedAt,
    this.confirmationsCount = 1,
    this.resolutionsCount = 0,
    this.isVerified = false,
    this.status = 'active',
    this.upvotedBy = const [],
  });

  factory CitizenReport.fromJson(Map<String, dynamic> json) {
    final posList = json['position'] as List<dynamic>?;
    final lat = posList != null && posList.isNotEmpty ? (posList[0] as num).toDouble() : 3.8480;
    final lng = posList != null && posList.length > 1 ? (posList[1] as num).toDouble() : 11.5021;

    return CitizenReport(
      id: json['id'] as String? ?? 'rep_${DateTime.now().millisecondsSinceEpoch}',
      author: json['author'] as String? ?? 'Anonyme',
      city: json['city'] as String? ?? 'Yaoundé',
      category: CitizenReportCategory.fromString(json['category'] as String?),
      title: json['title'] as String? ?? 'Incident signalé',
      locationDescription: json['locationDescription'] as String? ?? '',
      position: LatLng(lat, lng),
      severity: CitizenReportSeverity.fromString(json['severity'] as String?),
      reportedAt: json['reportedAt'] != null
          ? DateTime.tryParse(json['reportedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      confirmationsCount: json['confirmationsCount'] as int? ?? 1,
      resolutionsCount: json['resolutionsCount'] as int? ?? 0,
      isVerified: json['isVerified'] as bool? ?? false,
      status: json['status'] as String? ?? 'active',
      upvotedBy: (json['upvotedBy'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'author': author,
      'city': city,
      'category': category.name,
      'title': title,
      'locationDescription': locationDescription,
      'position': [position.latitude, position.longitude],
      'severity': severity.name,
      'reportedAt': reportedAt.toIso8601String(),
      'confirmationsCount': confirmationsCount,
      'resolutionsCount': resolutionsCount,
      'isVerified': isVerified,
      'status': status,
      'upvotedBy': upvotedBy,
    };
  }

  CitizenReport copyWith({
    String? id,
    String? author,
    String? city,
    CitizenReportCategory? category,
    String? title,
    String? locationDescription,
    LatLng? position,
    CitizenReportSeverity? severity,
    DateTime? reportedAt,
    int? confirmationsCount,
    int? resolutionsCount,
    bool? isVerified,
    String? status,
    List<String>? upvotedBy,
  }) {
    return CitizenReport(
      id: id ?? this.id,
      author: author ?? this.author,
      city: city ?? this.city,
      category: category ?? this.category,
      title: title ?? this.title,
      locationDescription: locationDescription ?? this.locationDescription,
      position: position ?? this.position,
      severity: severity ?? this.severity,
      reportedAt: reportedAt ?? this.reportedAt,
      confirmationsCount: confirmationsCount ?? this.confirmationsCount,
      resolutionsCount: resolutionsCount ?? this.resolutionsCount,
      isVerified: isVerified ?? this.isVerified,
      status: status ?? this.status,
      upvotedBy: upvotedBy ?? this.upvotedBy,
    );
  }
}
