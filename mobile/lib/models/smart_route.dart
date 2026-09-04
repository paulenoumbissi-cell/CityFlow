import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class RouteStepInstruction {
  final String instruction;
  final String distance;
  final String action;
  final String icon;

  const RouteStepInstruction({
    required this.instruction,
    required this.distance,
    required this.action,
    required this.icon,
  });

  factory RouteStepInstruction.fromJson(Map<String, dynamic> json) {
    return RouteStepInstruction(
      instruction: json['instruction'] as String? ?? '',
      distance: json['distance'] as String? ?? '500 m',
      action: json['action'] as String? ?? 'straight',
      icon: json['icon'] as String? ?? 'navigation',
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
  final List<String> highlights;
  final List<LatLng> coordinates;
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
    required this.highlights,
    required this.coordinates,
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
      highlights: highlights,
      coordinates: coords,
      steps: steps,
    );
  }
}
