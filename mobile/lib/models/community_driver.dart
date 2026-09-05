import 'package:latlong2/latlong.dart';

class CommunityDriver {
  final String id;
  final String name;
  final String mood;
  final String moodEmoji;
  final LatLng position;
  final double speedKmh;
  final int points;
  final String rank;

  const CommunityDriver({
    required this.id,
    required this.name,
    required this.mood,
    required this.moodEmoji,
    required this.position,
    required this.speedKmh,
    required this.points,
    required this.rank,
  });

  factory CommunityDriver.fromJson(Map<String, dynamic> json) {
    final posList = json['position'] as List<dynamic>?;
    return CommunityDriver(
      id: json['id'] as String? ?? 'wazer_${DateTime.now().millisecondsSinceEpoch}',
      name: json['name'] as String? ?? 'Wazer Citoyen',
      mood: json['mood'] as String? ?? 'cool',
      moodEmoji: json['moodEmoji'] as String? ?? '😎',
      position: (posList != null && posList.length >= 2)
          ? LatLng((posList[0] as num).toDouble(), (posList[1] as num).toDouble())
          : const LatLng(3.8666, 11.5167),
      speedKmh: (json['speedKmh'] as num?)?.toDouble() ?? 40.0,
      points: (json['points'] as num?)?.toInt() ?? 350,
      rank: json['rank'] as String? ?? 'Conducteur Actif',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'mood': mood,
      'moodEmoji': moodEmoji,
      'position': [position.latitude, position.longitude],
      'speedKmh': speedKmh,
      'points': points,
      'rank': rank,
    };
  }
}
