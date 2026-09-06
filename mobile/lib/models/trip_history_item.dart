import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class TripHistoryItem {
  final String id;
  final String title;
  final String subtitle;
  final LatLng destinationPos;
  final DateTime timestamp;
  final String category; // 'recent_route', 'search', 'favorite'

  TripHistoryItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.destinationPos,
    DateTime? timestamp,
    this.category = 'recent_route',
  }) : timestamp = timestamp ?? DateTime.now();

  IconData get icon {
    switch (category) {
      case 'search':
        return Icons.search_rounded;
      case 'favorite':
        return Icons.star_rounded;
      default:
        return Icons.history_rounded;
    }
  }

  String get relativeTimeLabel {
    final diff = DateTime.now().difference(timestamp);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays == 1) return 'Hier';
    return 'Il y a ${diff.inDays} jours';
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'subtitle': subtitle,
      'lat': destinationPos.latitude,
      'lng': destinationPos.longitude,
      'timestamp': timestamp.toIso8601String(),
      'category': category,
    };
  }

  factory TripHistoryItem.fromJson(Map<String, dynamic> json) {
    return TripHistoryItem(
      id: json['id'] as String,
      title: json['title'] as String,
      subtitle: (json['subtitle'] as String?) ?? '',
      destinationPos: LatLng(
        (json['lat'] as num).toDouble(),
        (json['lng'] as num).toDouble(),
      ),
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      category: (json['category'] as String?) ?? 'recent_route',
    );
  }
}
