import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class IntersectionLight {
  final String id;
  final String name;
  final LatLng position;
  final String state; // 'green_wave', 'cleared', 'pending'
  final String crossTrafficLight; // 'red'

  const IntersectionLight({
    required this.id,
    required this.name,
    required this.position,
    this.state = 'pending',
    this.crossTrafficLight = 'red',
  });

  factory IntersectionLight.fromJson(Map<String, dynamic> json) {
    final pos = json['position'] as List<dynamic>?;
    final lat = pos != null && pos.isNotEmpty ? (pos[0] as num).toDouble() : 3.8480;
    final lng = pos != null && pos.length > 1 ? (pos[1] as num).toDouble() : 11.5021;

    return IntersectionLight(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Carrefour',
      position: LatLng(lat, lng),
      state: json['state'] as String? ?? 'pending',
      crossTrafficLight: json['crossTrafficLight'] as String? ?? 'red',
    );
  }
}

class BroadcastAlertInfo {
  final bool active;
  final String title;
  final String message;
  final String advisedAction;
  final double zoneRadiusKm;

  const BroadcastAlertInfo({
    this.active = false,
    required this.title,
    required this.message,
    required this.advisedAction,
    this.zoneRadiusKm = 2.5,
  });

  factory BroadcastAlertInfo.fromJson(Map<String, dynamic> json) {
    return BroadcastAlertInfo(
      active: json['active'] as bool? ?? false,
      title: json['title'] as String? ?? 'Alerte Urgence',
      message: json['message'] as String? ?? '',
      advisedAction: json['advisedAction'] as String? ?? 'Serrer à droite',
      zoneRadiusKm: (json['zoneRadiusKm'] as num?)?.toDouble() ?? 2.5,
    );
  }
}

class EmergencyMission {
  final String id;
  final String status; // 'in_progress', 'completed', 'cancelled'
  final String vehicleType;
  final String vehicleName;
  final String badge;
  final Color color;
  final String city;
  final String corridorId;
  final String corridorName;
  final String origin;
  final String destination;
  final double distanceKm;
  final int nominalDurationMinutes;
  final int priorityDurationMinutes;
  final int timeSavedMinutes;
  final int speedKmh;
  final int currentStepIndex;
  final List<LatLng> coordinates;
  final List<IntersectionLight> intersections;
  final BroadcastAlertInfo? broadcastAlert;

  const EmergencyMission({
    required this.id,
    required this.status,
    required this.vehicleType,
    required this.vehicleName,
    required this.badge,
    required this.color,
    required this.city,
    required this.corridorId,
    required this.corridorName,
    required this.origin,
    required this.destination,
    required this.distanceKm,
    required this.nominalDurationMinutes,
    required this.priorityDurationMinutes,
    required this.timeSavedMinutes,
    this.speedKmh = 74,
    this.currentStepIndex = 0,
    required this.coordinates,
    required this.intersections,
    this.broadcastAlert,
  });

  factory EmergencyMission.fromJson(Map<String, dynamic> json) {
    final rawColor = json['color'] as String? ?? '#EF4444';
    final parsedColor = Color(int.parse(rawColor.replaceFirst('#', '0xFF')));

    final rawCoords = json['coordinates'] as List<dynamic>? ?? [];
    final coords = rawCoords.map((c) {
      final list = c as List<dynamic>;
      return LatLng((list[0] as num).toDouble(), (list[1] as num).toDouble());
    }).toList();

    final rawInts = json['intersections'] as List<dynamic>? ?? [];
    final ints = rawInts.map((i) => IntersectionLight.fromJson(i as Map<String, dynamic>)).toList();

    return EmergencyMission(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'in_progress',
      vehicleType: json['vehicleType'] as String? ?? 'ambulance',
      vehicleName: json['vehicleName'] as String? ?? 'Ambulance SAMU',
      badge: json['badge'] as String? ?? 'Urgence',
      color: parsedColor,
      city: json['city'] as String? ?? 'Yaoundé',
      corridorId: json['corridorId'] as String? ?? '',
      corridorName: json['corridorName'] as String? ?? 'Corridor Prioritaire',
      origin: json['origin'] as String? ?? '',
      destination: json['destination'] as String? ?? '',
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 5.0,
      nominalDurationMinutes: json['nominalDurationMinutes'] as int? ?? 25,
      priorityDurationMinutes: json['priorityDurationMinutes'] as int? ?? 9,
      timeSavedMinutes: json['timeSavedMinutes'] as int? ?? 16,
      speedKmh: json['speedKmh'] as int? ?? 74,
      currentStepIndex: json['currentStepIndex'] as int? ?? 0,
      coordinates: coords,
      intersections: ints,
      broadcastAlert: json['broadcastAlert'] != null
          ? BroadcastAlertInfo.fromJson(json['broadcastAlert'] as Map<String, dynamic>)
          : null,
    );
  }
}
