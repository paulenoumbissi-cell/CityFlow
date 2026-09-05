import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class TrafficSegment {
  final List<LatLng> coordinates;
  final String status; // 'fluid', 'moderate', 'heavy', 'jammed'
  final Color color;
  final double speedKmh;
  final int congestionPercent;
  final String? label;

  const TrafficSegment({
    required this.coordinates,
    required this.status,
    required this.color,
    required this.speedKmh,
    required this.congestionPercent,
    this.label,
  });

  factory TrafficSegment.fromJson(Map<String, dynamic> json) {
    final rawCoords = json['coordinates'] as List<dynamic>? ?? [];
    final coords = rawCoords.map((c) {
      final list = c as List<dynamic>;
      return LatLng((list[0] as num).toDouble(), (list[1] as num).toDouble());
    }).toList();

    final rawColor = json['color'] as String? ?? '#10B981';
    final parsedColor = Color(int.parse(rawColor.replaceFirst('#', '0xFF')));

    return TrafficSegment(
      coordinates: coords,
      status: json['status'] as String? ?? 'fluid',
      color: parsedColor,
      speedKmh: (json['speedKmh'] as num?)?.toDouble() ?? 35.0,
      congestionPercent: json['congestionPercent'] as int? ?? 20,
      label: json['label'] as String?,
    );
  }
}

class RouteStepInstruction {
  final String instruction;
  final String distance;
  final int rawDistanceMeters;
  final String action;
  final String icon;
  final String maneuverIcon;
  final String spokenText;
  final LatLng? position;

  const RouteStepInstruction({
    required this.instruction,
    required this.distance,
    this.rawDistanceMeters = 400,
    required this.action,
    required this.icon,
    this.maneuverIcon = 'navigation',
    this.spokenText = '',
    this.position,
  });

  factory RouteStepInstruction.fromJson(Map<String, dynamic> json) {
    LatLng? pos;
    if (json['position'] is List && (json['position'] as List).length >= 2) {
      final list = json['position'] as List;
      pos = LatLng((list[0] as num).toDouble(), (list[1] as num).toDouble());
    } else if (json['location'] is List && (json['location'] as List).length >= 2) {
      final list = json['location'] as List;
      pos = LatLng((list[0] as num).toDouble(), (list[1] as num).toDouble());
    }

    return RouteStepInstruction(
      instruction: json['instruction'] as String? ?? '',
      distance: json['distance'] as String? ?? '500 m',
      rawDistanceMeters: json['rawDistanceMeters'] as int? ?? 400,
      action: json['action'] as String? ?? 'straight',
      icon: json['icon'] as String? ?? 'navigation',
      maneuverIcon: json['maneuverIcon'] as String? ?? json['icon'] as String? ?? 'navigation',
      spokenText: json['spokenText'] as String? ?? json['instruction'] as String? ?? '',
      position: pos,
    );
  }
}

class MultimodalOption {
  final String mode; // 'car', 'mototaxi', 'taxi', 'walking'
  final String label;
  final String icon;
  final int durationMinutes;
  final int estimatedCostFcfa;
  final String costLabel;
  final String co2Kg;
  final int? caloriesKcal;
  final String comfort;
  final bool isFastest;

  const MultimodalOption({
    required this.mode,
    required this.label,
    required this.icon,
    required this.durationMinutes,
    required this.estimatedCostFcfa,
    required this.costLabel,
    required this.co2Kg,
    this.caloriesKcal,
    required this.comfort,
    this.isFastest = false,
  });

  factory MultimodalOption.fromJson(Map<String, dynamic> json) {
    return MultimodalOption(
      mode: json['mode'] as String? ?? 'car',
      label: json['label'] as String? ?? 'Voiture',
      icon: json['icon'] as String? ?? 'car',
      durationMinutes: json['durationMinutes'] as int? ?? 20,
      estimatedCostFcfa: json['estimatedCostFcfa'] as int? ?? 500,
      costLabel: json['costLabel'] as String? ?? '500 FCFA',
      co2Kg: json['co2Kg']?.toString() ?? '0.50',
      caloriesKcal: json['caloriesKcal'] as int?,
      comfort: json['comfort'] as String? ?? '',
      isFastest: json['isFastest'] as bool? ?? false,
    );
  }
}

class SmartRoute {
  final String id;
  final String type; // 'fastest', 'eco', 'secure'
  final String title;
  final String badge;
  final String tag;
  final int durationMinutes;
  final double distanceKm;
  final int delaySavedMinutes;
  final double co2SavedKg;
  final String ecoScore; // 'A+', 'A', 'B+'
  final int congestionIndex;
  final Color color;
  final String fluidityLevel; // 'fluid', 'moderate', 'dense'
  final bool isOsrmRealRoad;
  final List<String> highlights;
  final List<LatLng> coordinates;
  final List<TrafficSegment> trafficSegments;
  final List<RouteStepInstruction> steps;

  const SmartRoute({
    required this.id,
    required this.type,
    required this.title,
    required this.badge,
    required this.tag,
    required this.durationMinutes,
    required this.distanceKm,
    required this.delaySavedMinutes,
    required this.co2SavedKg,
    required this.ecoScore,
    required this.congestionIndex,
    required this.color,
    required this.fluidityLevel,
    this.isOsrmRealRoad = false,
    required this.highlights,
    required this.coordinates,
    required this.trafficSegments,
    required this.steps,
  });

  factory SmartRoute.fromJson(Map<String, dynamic> json) {
    final rawColor = json['color'] as String? ?? '#00875A';
    final parsedColor = Color(int.parse(rawColor.replaceFirst('#', '0xFF')));

    final rawCoords = json['coordinates'] as List<dynamic>? ?? [];
    final coords = rawCoords.map((c) {
      final list = c as List<dynamic>;
      return LatLng((list[0] as num).toDouble(), (list[1] as num).toDouble());
    }).toList();

    final rawSteps = json['steps'] as List<dynamic>? ?? [];
    final steps = rawSteps.map((s) => RouteStepInstruction.fromJson(s as Map<String, dynamic>)).toList();

    final rawHighlights = json['highlights'] as List<dynamic>? ?? [];
    final highlights = rawHighlights.map((h) => h.toString()).toList();

    final rawSegments = json['trafficSegments'] as List<dynamic>? ?? [];
    List<TrafficSegment> segments = rawSegments.map((s) => TrafficSegment.fromJson(s as Map<String, dynamic>)).toList();

    // Fallback si pas de segments reçus : découper coordinates en segments de trafic
    if (segments.isEmpty && coords.length >= 2) {
      final chunkSize = (coords.length / 3).ceil().clamp(2, coords.length);
      for (int i = 0; i < coords.length - 1; i += chunkSize - 1) {
        final slice = coords.sublist(i, (i + chunkSize).clamp(0, coords.length));
        if (slice.length >= 2) {
          final isHeavy = (i ~/ chunkSize) % 2 == 1;
          segments.add(TrafficSegment(
            coordinates: slice,
            status: isHeavy ? 'heavy' : 'fluid',
            color: isHeavy ? const Color(0xFFEF4444) : const Color(0xFF10B981),
            speedKmh: isHeavy ? 14.0 : 45.0,
            congestionPercent: isHeavy ? 75 : 20,
            label: isHeavy ? 'Ralentissement' : 'Fluide',
          ));
        }
      }
    }

    return SmartRoute(
      id: json['id'] as String? ?? 'route_fastest',
      type: json['type'] as String? ?? 'fastest',
      title: json['title'] as String? ?? 'Itinéraire recommandé',
      badge: json['badge'] as String? ?? 'Recommandé',
      tag: json['tag'] as String? ?? 'Optimal',
      durationMinutes: json['durationMinutes'] as int? ?? 22,
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 5.0,
      delaySavedMinutes: json['delaySavedMinutes'] as int? ?? 10,
      co2SavedKg: (json['co2SavedKg'] as num?)?.toDouble() ?? 0.4,
      ecoScore: json['ecoScore'] as String? ?? 'B+',
      congestionIndex: json['congestionIndex'] as int? ?? 30,
      color: parsedColor,
      fluidityLevel: json['fluidityLevel'] as String? ?? 'fluid',
      isOsrmRealRoad: json['isOsrmRealRoad'] as bool? ?? false,
      highlights: highlights,
      coordinates: coords,
      trafficSegments: segments,
      steps: steps,
    );
  }
}
