import 'package:latlong2/latlong.dart';

/// Notification d'incident sur trajet reçue via WebSocket
/// Générée par le backend quand un signalement citoyen est détecté
/// à moins de 200m du trajet actif du conducteur.
class RouteIncidentNotification {
  final String id;
  final String reportId;
  final String title;
  final String category;       // ex: 'accident', 'trafficJam', 'roadworks'
  final String severity;       // ex: 'high', 'moderate', 'critical'
  final String locationDescription;
  final int distanceMeters;    // distance entre l'incident et le trajet actif
  final LatLng? position;
  final String city;
  final DateTime receivedAt;
  bool isDismissed;

  RouteIncidentNotification({
    required this.id,
    required this.reportId,
    required this.title,
    required this.category,
    required this.severity,
    required this.locationDescription,
    required this.distanceMeters,
    this.position,
    required this.city,
    required this.receivedAt,
    this.isDismissed = false,
  });

  factory RouteIncidentNotification.fromWsAlert(Map<String, dynamic> alert) {
    LatLng? pos;
    final rawPos = alert['position'];
    if (rawPos is List && rawPos.length >= 2) {
      pos = LatLng((rawPos[0] as num).toDouble(), (rawPos[1] as num).toDouble());
    }

    return RouteIncidentNotification(
      id: 'notif_${DateTime.now().millisecondsSinceEpoch}',
      reportId: alert['reportId'] as String? ?? '',
      title: alert['title'] as String? ?? 'Incident sur votre trajet',
      category: alert['category'] as String? ?? 'accident',
      severity: alert['severity'] as String? ?? 'moderate',
      locationDescription: alert['locationDescription'] as String? ?? '',
      distanceMeters: alert['distanceMeters'] as int? ?? 0,
      position: pos,
      city: alert['city'] as String? ?? '',
      receivedAt: DateTime.now(),
    );
  }

  /// Emoji et couleur selon la catégorie
  String get categoryEmoji {
    switch (category) {
      case 'accident':        return '🚨';
      case 'trafficJam':
      case 'trafficBlock':   return '🚗';
      case 'trafficLight':   return '🚦';
      case 'roadworks':      return '🚧';
      case 'flooding':       return '🌊';
      case 'closure':        return '⛔';
      case 'police':         return '👮';
      case 'hazard':         return '⚠️';
      case 'motoRush':       return '🏍️';
      case 'breakdown':      return '🔧';
      case 'sosHelp':        return '🆘';
      default:               return '📍';
    }
  }

  /// Label court de la distance
  String get distanceLabel {
    if (distanceMeters < 50)  return 'Sur votre route';
    if (distanceMeters < 100) return 'À ${distanceMeters}m';
    if (distanceMeters < 1000) return 'À ${distanceMeters}m';
    return 'À ${(distanceMeters / 1000).toStringAsFixed(1)} km';
  }

  /// Urgence : true si critique ou élevé
  bool get isUrgent => severity == 'critical' || severity == 'high';
}
