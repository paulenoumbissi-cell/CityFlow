import 'package:latlong2/latlong.dart';

enum CongestionLevel {
  fluid,     // Vert - Circulation normale (> 35 km/h)
  moderate,  // Jaune/Orange - Ralentissements (20 - 35 km/h)
  heavy,     // Rouge - Forts embouteillages (10 - 20 km/h)
  jammed,    // Rouge foncé - Nœud saturé / Bloqué (< 10 km/h)
}

class TrafficPrediction {
  final int hourOffset; // +1h, +2h, +3h, etc.
  final double congestionPercentage; // 0 à 100%
  final String label; // "15:00", "16:00", etc.
  final String weatherInfluence; // "Pluie modérée", "Clair", "Heure de pointe"

  const TrafficPrediction({
    required this.hourOffset,
    required this.congestionPercentage,
    required this.label,
    required this.weatherInfluence,
  });
}

class TrafficNode {
  final String id;
  final String name;
  final String city; // "Yaoundé" ou "Douala"
  final LatLng position;
  final CongestionLevel currentCongestion;
  final double averageSpeedKmh;
  final int estimatedDelayMinutes;
  final int vehicleCountPerHour;
  final List<TrafficPrediction> predictions;
  final List<LatLng> connectedSegments;

  const TrafficNode({
    required this.id,
    required this.name,
    required this.city,
    required this.position,
    required this.currentCongestion,
    required this.averageSpeedKmh,
    required this.estimatedDelayMinutes,
    required this.vehicleCountPerHour,
    required this.predictions,
    this.connectedSegments = const [],
  });

  TrafficNode copyWith({
    String? id,
    String? name,
    String? city,
    LatLng? position,
    CongestionLevel? currentCongestion,
    double? averageSpeedKmh,
    int? estimatedDelayMinutes,
    int? vehicleCountPerHour,
    List<TrafficPrediction>? predictions,
    List<LatLng>? connectedSegments,
  }) {
    return TrafficNode(
      id: id ?? this.id,
      name: name ?? this.name,
      city: city ?? this.city,
      position: position ?? this.position,
      currentCongestion: currentCongestion ?? this.currentCongestion,
      averageSpeedKmh: averageSpeedKmh ?? this.averageSpeedKmh,
      estimatedDelayMinutes: estimatedDelayMinutes ?? this.estimatedDelayMinutes,
      vehicleCountPerHour: vehicleCountPerHour ?? this.vehicleCountPerHour,
      predictions: predictions ?? this.predictions,
      connectedSegments: connectedSegments ?? this.connectedSegments,
    );
  }
}
