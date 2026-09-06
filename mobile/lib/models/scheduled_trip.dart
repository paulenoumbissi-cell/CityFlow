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
    );
  }
}
