import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum CitizenReportCategory {
  trafficJam('Embouteillage', Icons.traffic_rounded, Color(0xFFFF9800)),
  trafficLight('Feu en panne', Icons.traffic_outlined, Color(0xFFE11D48)),
  motoRush('Motos / Blocage', Icons.two_wheeler_rounded, Color(0xFFF97316)),
  police('Police & Contrôle', Icons.local_police_rounded, Color(0xFF2563EB)),
  accident('Accident', Icons.car_crash_rounded, Color(0xFFEF4444)),
  funeral('Deuil / Bâche', Icons.night_shelter_rounded, Color(0xFF7C3AED)),
  truckBreakdown('Camion / Grumier', Icons.local_shipping_rounded, Color(0xFFD97706)),
  hazard('Danger / Nid-de-poule', Icons.warning_amber_rounded, Color(0xFFF59E0B)),
  roadworks('Travaux', Icons.construction_rounded, Color(0xFFEA580C)),
  closure('Route barrée', Icons.block_rounded, Color(0xFFDC2626)),
  flooding('Inondation', Icons.water_drop_rounded, Color(0xFF0284C7)),
  gasStation('Carburant', Icons.local_gas_station_rounded, Color(0xFF10B981)),
  breakdown('Véhicule en panne', Icons.build_rounded, Color(0xFF64748B)),
  sosHelp('SOS Dépannage', Icons.emergency_rounded, Color(0xFFDC2626)),
  other('Info citoyenne', Icons.campaign_rounded, Color(0xFF8B5CF6));

  final String label;
  final IconData icon;
  final Color color;
  const CitizenReportCategory(this.label, this.icon, this.color);

  static CitizenReportCategory fromString(String? val) {
    switch (val?.toLowerCase()) {
      case 'police':
      case 'radar':
        return CitizenReportCategory.police;
      case 'trafficjam':
      case 'trafficblock':
      case 'bouchon':
        return CitizenReportCategory.trafficJam;
      case 'trafficlight':
      case 'feu':
        return CitizenReportCategory.trafficLight;
      case 'motorush':
      case 'moto':
        return CitizenReportCategory.motoRush;
      case 'funeral':
      case 'deuil':
      case 'bache':
        return CitizenReportCategory.funeral;
      case 'truckbreakdown':
      case 'grumier':
      case 'camion':
        return CitizenReportCategory.truckBreakdown;
      case 'roadworks':
      case 'roadwork':
      case 'travaux':
        return CitizenReportCategory.roadworks;
      case 'closure':
      case 'barree':
        return CitizenReportCategory.closure;
      case 'flooding':
      case 'flood':
      case 'inondation':
        return CitizenReportCategory.flooding;
      case 'gasstation':
      case 'fuel':
      case 'carburant':
        return CitizenReportCategory.gasStation;
      case 'breakdown':
      case 'panne':
        return CitizenReportCategory.breakdown;
      case 'soshelp':
      case 'sos':
      case 'assistance':
        return CitizenReportCategory.sosHelp;
      case 'hazard':
      case 'danger':
      case 'pothole':
        return CitizenReportCategory.hazard;
      case 'other':
      case 'info':
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

class CommunityRadioMessage {
  final String id;
  final String author;
  final String authorBadge;
  final String city;
  final String crossroad;
  final String message;
  final bool isAudio;
  final int audioDurationSeconds;
  final DateTime createdAt;
  final int likesCount;
  final bool isLikedByMe;

  const CommunityRadioMessage({
    required this.id,
    required this.author,
    required this.authorBadge,
    required this.city,
    required this.crossroad,
    required this.message,
    this.isAudio = false,
    this.audioDurationSeconds = 0,
    required this.createdAt,
    this.likesCount = 0,
    this.isLikedByMe = false,
  });

  factory CommunityRadioMessage.fromJson(Map<String, dynamic> json) {
    return CommunityRadioMessage(
      id: json['id'] as String? ?? 'msg_${DateTime.now().millisecondsSinceEpoch}',
      author: json['author'] as String? ?? 'Conducteur',
      authorBadge: json['authorBadge'] as String? ?? '🚕 Taxi Citoyen',
      city: json['city'] as String? ?? 'Yaoundé',
      crossroad: json['crossroad'] as String? ?? 'Carrefour Nlongkak',
      message: json['message'] as String? ?? '',
      isAudio: json['isAudio'] as bool? ?? false,
      audioDurationSeconds: json['audioDurationSeconds'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      likesCount: json['likesCount'] as int? ?? 0,
      isLikedByMe: json['isLikedByMe'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'author': author,
      'authorBadge': authorBadge,
      'city': city,
      'crossroad': crossroad,
      'message': message,
      'isAudio': isAudio,
      'audioDurationSeconds': audioDurationSeconds,
      'createdAt': createdAt.toIso8601String(),
      'likesCount': likesCount,
      'isLikedByMe': isLikedByMe,
    };
  }

  CommunityRadioMessage copyWith({
    String? id,
    String? author,
    String? authorBadge,
    String? city,
    String? crossroad,
    String? message,
    bool? isAudio,
    int? audioDurationSeconds,
    DateTime? createdAt,
    int? likesCount,
    bool? isLikedByMe,
  }) {
    return CommunityRadioMessage(
      id: id ?? this.id,
      author: author ?? this.author,
      authorBadge: authorBadge ?? this.authorBadge,
      city: city ?? this.city,
      crossroad: crossroad ?? this.crossroad,
      message: message ?? this.message,
      isAudio: isAudio ?? this.isAudio,
      audioDurationSeconds: audioDurationSeconds ?? this.audioDurationSeconds,
      createdAt: createdAt ?? this.createdAt,
      likesCount: likesCount ?? this.likesCount,
      isLikedByMe: isLikedByMe ?? this.isLikedByMe,
    );
  }
}

class SosAssistanceRequest {
  final String id;
  final String author;
  final String phone;
  final String city;
  final String crossroad;
  final String sosType; // Crevaison, Batterie, Panne Sèche, Remorquage
  final String details;
  final DateTime createdAt;
  final String status; // 'searching', 'assisted', 'resolved'
  final String? helperName;

  const SosAssistanceRequest({
    required this.id,
    required this.author,
    required this.phone,
    required this.city,
    required this.crossroad,
    required this.sosType,
    required this.details,
    required this.createdAt,
    this.status = 'searching',
    this.helperName,
  });

  factory SosAssistanceRequest.fromJson(Map<String, dynamic> json) {
    return SosAssistanceRequest(
      id: json['id'] as String? ?? 'sos_${DateTime.now().millisecondsSinceEpoch}',
      author: json['author'] as String? ?? 'Automobiliste en panne',
      phone: json['phone'] as String? ?? '+237 6XX XX XX XX',
      city: json['city'] as String? ?? 'Yaoundé',
      crossroad: json['crossroad'] as String? ?? 'Poste Centrale',
      sosType: json['sosType'] as String? ?? 'Crevaison',
      details: json['details'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      status: json['status'] as String? ?? 'searching',
      helperName: json['helperName'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'author': author,
      'phone': phone,
      'city': city,
      'crossroad': crossroad,
      'sosType': sosType,
      'details': details,
      'createdAt': createdAt.toIso8601String(),
      'status': status,
      'helperName': helperName,
    };
  }

  SosAssistanceRequest copyWith({
    String? id,
    String? author,
    String? phone,
    String? city,
    String? crossroad,
    String? sosType,
    String? details,
    DateTime? createdAt,
    String? status,
    String? helperName,
  }) {
    return SosAssistanceRequest(
      id: id ?? this.id,
      author: author ?? this.author,
      phone: phone ?? this.phone,
      city: city ?? this.city,
      crossroad: crossroad ?? this.crossroad,
      sosType: sosType ?? this.sosType,
      details: details ?? this.details,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
      helperName: helperName ?? this.helperName,
    );
  }
}

