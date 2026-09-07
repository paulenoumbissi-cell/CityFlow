import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class ScheduledTrip {
  final String id;
  final String title;
  final String originName;
  final LatLng originPos;
  final String destinationName;
  final LatLng destinationPos;
  final TimeOfDay targetArrivalTime;
  final DateTime scheduledDate;
  final DateTime recommendedDepartureTime;
  final int estimatedDurationMinutes;
  final int trafficBufferMinutes;
  final bool isReminderActive;
  final List<int> repeatDays; // 1 = Lundi, 7 = Dimanche
  final String city;
  final String aiReasoning;
  final String roadStatus; // 'FLUID', 'MODERATE', 'HEAVY_CONGESTION', 'BLOCKED_OR_JAMMED'
  final String roadStatusLabel;
  final int congestionPercentage;
  final int averageSpeedKmh;
  final int nominalDurationMinutes;
  final int delayMinutes;
  final String? detourAdvice;
  final List<String> warnings;
  final bool isDepartureMode; // true = "Partir à", false = "Arriver à"

  ScheduledTrip({
    required this.id,
    required this.title,
    required this.originName,
    required this.originPos,
    required this.destinationName,
    required this.destinationPos,
    required this.targetArrivalTime,
    required this.scheduledDate,
    required this.recommendedDepartureTime,
    required this.estimatedDurationMinutes,
    required this.trafficBufferMinutes,
    this.isReminderActive = true,
    this.repeatDays = const [],
    required this.city,
    required this.aiReasoning,
    this.roadStatus = 'MODERATE',
    this.roadStatusLabel = 'Circulation modérée',
    this.congestionPercentage = 45,
    this.averageSpeedKmh = 25,
    this.nominalDurationMinutes = 15,
    this.delayMinutes = 8,
    this.detourAdvice,
    this.warnings = const [],
    this.isDepartureMode = false,
  });

  String get formattedArrivalTime {
    final hour = targetArrivalTime.hour.toString().padLeft(2, '0');
    final minute = targetArrivalTime.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String get formattedDepartureTime {
    final hour = recommendedDepartureTime.hour.toString().padLeft(2, '0');
    final minute = recommendedDepartureTime.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  int get totalMinutesBeforeDeparture {
    final now = DateTime.now();
    final diff = recommendedDepartureTime.difference(now).inMinutes;
    return diff;
  }

  bool get isPast => totalMinutesBeforeDeparture < 0;

  Color get statusColor {
    switch (roadStatus) {
      case 'FLUID':
        return const Color(0xFF10B981);
      case 'MODERATE':
        return const Color(0xFFF59E0B);
      case 'HEAVY_CONGESTION':
        return const Color(0xFFEA580C);
      case 'BLOCKED_OR_JAMMED':
      default:
        return const Color(0xFFDC2626);
    }
  }

  IconData get statusIcon {
    switch (roadStatus) {
      case 'FLUID':
        return Icons.check_circle_rounded;
      case 'MODERATE':
        return Icons.speed_rounded;
      case 'HEAVY_CONGESTION':
        return Icons.traffic_rounded;
      case 'BLOCKED_OR_JAMMED':
      default:
        return Icons.warning_amber_rounded;
    }
  }

  ScheduledTrip copyWith({
    String? id,
    String? title,
    String? originName,
    LatLng? originPos,
    String? destinationName,
    LatLng? destinationPos,
    TimeOfDay? targetArrivalTime,
    DateTime? scheduledDate,
    DateTime? recommendedDepartureTime,
    int? estimatedDurationMinutes,
    int? trafficBufferMinutes,
    bool? isReminderActive,
    List<int>? repeatDays,
    String? city,
    String? aiReasoning,
    String? roadStatus,
    String? roadStatusLabel,
    int? congestionPercentage,
    int? averageSpeedKmh,
    int? nominalDurationMinutes,
    int? delayMinutes,
    String? detourAdvice,
    List<String>? warnings,
    bool? isDepartureMode,
  }) {
    return ScheduledTrip(
      id: id ?? this.id,
      title: title ?? this.title,
      originName: originName ?? this.originName,
      originPos: originPos ?? this.originPos,
      destinationName: destinationName ?? this.destinationName,
      destinationPos: destinationPos ?? this.destinationPos,
      targetArrivalTime: targetArrivalTime ?? this.targetArrivalTime,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      recommendedDepartureTime: recommendedDepartureTime ?? this.recommendedDepartureTime,
      estimatedDurationMinutes: estimatedDurationMinutes ?? this.estimatedDurationMinutes,
      trafficBufferMinutes: trafficBufferMinutes ?? this.trafficBufferMinutes,
      isReminderActive: isReminderActive ?? this.isReminderActive,
      repeatDays: repeatDays ?? this.repeatDays,
      city: city ?? this.city,
      aiReasoning: aiReasoning ?? this.aiReasoning,
      roadStatus: roadStatus ?? this.roadStatus,
      roadStatusLabel: roadStatusLabel ?? this.roadStatusLabel,
      congestionPercentage: congestionPercentage ?? this.congestionPercentage,
      averageSpeedKmh: averageSpeedKmh ?? this.averageSpeedKmh,
      nominalDurationMinutes: nominalDurationMinutes ?? this.nominalDurationMinutes,
      delayMinutes: delayMinutes ?? this.delayMinutes,
      detourAdvice: detourAdvice ?? this.detourAdvice,
      warnings: warnings ?? this.warnings,
      isDepartureMode: isDepartureMode ?? this.isDepartureMode,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'originName': originName,
      'originLat': originPos.latitude,
      'originLng': originPos.longitude,
      'destinationName': destinationName,
      'destinationLat': destinationPos.latitude,
      'destinationLng': destinationPos.longitude,
      'targetArrivalHour': targetArrivalTime.hour,
      'targetArrivalMinute': targetArrivalTime.minute,
      'scheduledDate': scheduledDate.toIso8601String(),
      'recommendedDepartureTime': recommendedDepartureTime.toIso8601String(),
      'estimatedDurationMinutes': estimatedDurationMinutes,
      'trafficBufferMinutes': trafficBufferMinutes,
      'isReminderActive': isReminderActive,
      'repeatDays': repeatDays,
      'city': city,
      'aiReasoning': aiReasoning,
      'roadStatus': roadStatus,
      'roadStatusLabel': roadStatusLabel,
      'congestionPercentage': congestionPercentage,
      'averageSpeedKmh': averageSpeedKmh,
      'nominalDurationMinutes': nominalDurationMinutes,
      'delayMinutes': delayMinutes,
      'detourAdvice': detourAdvice,
      'warnings': warnings,
      'isDepartureMode': isDepartureMode,
    };
  }

  factory ScheduledTrip.fromJson(Map<String, dynamic> json) {
    return ScheduledTrip(
      id: json['id'] as String,
      title: json['title'] as String,
      originName: json['originName'] as String,
      originPos: LatLng(
        (json['originLat'] as num).toDouble(),
        (json['originLng'] as num).toDouble(),
      ),
      destinationName: json['destinationName'] as String,
      destinationPos: LatLng(
        (json['destinationLat'] as num).toDouble(),
        (json['destinationLng'] as num).toDouble(),
      ),
      targetArrivalTime: TimeOfDay(
        hour: json['targetArrivalHour'] as int? ?? 8,
        minute: json['targetArrivalMinute'] as int? ?? 0,
      ),
      scheduledDate: json['scheduledDate'] != null
          ? DateTime.tryParse(json['scheduledDate'] as String) ?? DateTime.now()
          : DateTime.now(),
      recommendedDepartureTime: json['recommendedDepartureTime'] != null
          ? DateTime.tryParse(json['recommendedDepartureTime'] as String) ?? DateTime.now()
          : DateTime.now(),
      estimatedDurationMinutes: json['estimatedDurationMinutes'] as int? ?? 25,
      trafficBufferMinutes: json['trafficBufferMinutes'] as int? ?? 10,
      isReminderActive: json['isReminderActive'] as bool? ?? true,
      repeatDays: (json['repeatDays'] as List<dynamic>?)?.map((e) => e as int).toList() ?? [],
      city: (json['city'] as String?) ?? 'Yaoundé',
      aiReasoning: (json['aiReasoning'] as String?) ?? 'Calculé selon le flux moyen de circulation.',
      roadStatus: (json['roadStatus'] as String?) ?? 'MODERATE',
      roadStatusLabel: (json['roadStatusLabel'] as String?) ?? 'Circulation modérée',
      congestionPercentage: json['congestionPercentage'] as int? ?? 45,
      averageSpeedKmh: json['averageSpeedKmh'] as int? ?? 25,
      nominalDurationMinutes: json['nominalDurationMinutes'] as int? ?? 15,
      delayMinutes: json['delayMinutes'] as int? ?? 8,
      detourAdvice: json['detourAdvice'] as String?,
      warnings: (json['warnings'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      isDepartureMode: json['isDepartureMode'] as bool? ?? false,
    );
  }
}
