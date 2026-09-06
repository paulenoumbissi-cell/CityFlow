import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum SavedPlaceCategory {
  home,
  work,
  school,
  market,
  hospital,
  gym,
  custom,
}

class SavedPlace {
  final String id;
  final String title;
  final String address;
  final SavedPlaceCategory category;
  final LatLng position;
  final String city;
  final DateTime createdAt;

  SavedPlace({
    required this.id,
    required this.title,
    required this.address,
    required this.category,
    required this.position,
    required this.city,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  IconData get icon {
    switch (category) {
      case SavedPlaceCategory.home:
        return Icons.home_rounded;
      case SavedPlaceCategory.work:
        return Icons.work_rounded;
      case SavedPlaceCategory.school:
        return Icons.school_rounded;
      case SavedPlaceCategory.market:
        return Icons.shopping_basket_rounded;
      case SavedPlaceCategory.hospital:
        return Icons.local_hospital_rounded;
      case SavedPlaceCategory.gym:
        return Icons.fitness_center_rounded;
      case SavedPlaceCategory.custom:
        return Icons.bookmark_rounded;
    }
  }

  Color get color {
    switch (category) {
      case SavedPlaceCategory.home:
        return const Color(0xFF00875A); // Vert Emeraude
      case SavedPlaceCategory.work:
        return const Color(0xFF0284C7); // Bleu Océan
      case SavedPlaceCategory.school:
        return const Color(0xFF8B5CF6); // Violet
      case SavedPlaceCategory.market:
        return const Color(0xFFEA580C); // Orange
      case SavedPlaceCategory.hospital:
        return const Color(0xFFEF4444); // Rouge
      case SavedPlaceCategory.gym:
        return const Color(0xFF10B981); // Menthe
      case SavedPlaceCategory.custom:
        return const Color(0xFF006666); // Sarcelle
    }
  }

  String get categoryLabel {
    switch (category) {
      case SavedPlaceCategory.home:
        return 'Domicile';
      case SavedPlaceCategory.work:
        return 'Travail';
      case SavedPlaceCategory.school:
        return 'École';
      case SavedPlaceCategory.market:
        return 'Marché / Commerce';
      case SavedPlaceCategory.hospital:
        return 'Santé / Clinique';
      case SavedPlaceCategory.gym:
        return 'Sport / Loisirs';
      case SavedPlaceCategory.custom:
        return 'Favori';
    }
  }

  SavedPlace copyWith({
    String? id,
    String? title,
    String? address,
    SavedPlaceCategory? category,
    LatLng? position,
    String? city,
  }) {
    return SavedPlace(
      id: id ?? this.id,
      title: title ?? this.title,
      address: address ?? this.address,
      category: category ?? this.category,
      position: position ?? this.position,
      city: city ?? this.city,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'address': address,
      'category': category.name,
      'lat': position.latitude,
      'lng': position.longitude,
      'city': city,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory SavedPlace.fromJson(Map<String, dynamic> json) {
    return SavedPlace(
      id: json['id'] as String,
      title: json['title'] as String,
      address: json['address'] as String,
      category: SavedPlaceCategory.values.firstWhere(
        (c) => c.name == json['category'],
        orElse: () => SavedPlaceCategory.custom,
      ),
      position: LatLng(
        (json['lat'] as num).toDouble(),
        (json['lng'] as num).toDouble(),
      ),
      city: (json['city'] as String?) ?? 'Yaoundé',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
