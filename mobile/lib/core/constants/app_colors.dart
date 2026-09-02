import 'package:flutter/material.dart';

class AppColors {
  // Base background & surfaces (Light / Clean Smart City Style)
  static const Color background = Color(0xFFF6FAF8);
  static const Color surface = Colors.white;
  static const Color surfaceLight = Color(0xFFF1F5F9);
  static const Color card = Colors.white;
  static const Color cardBorder = Color(0xFFE2E8F0);

  // Brand Greens & Deep Navy
  static const Color primary = Color(0xFF00875A);        // Vert CityFlow vibrant
  static const Color primaryDark = Color(0xFF064E3B);    // Vert Forêt Foncé (Bannière Intelligence)
  static const Color primaryLight = Color(0xFFE8F5E9);   // Vert très clair badge
  static const Color primaryGlow = Color(0x3300875A);
  
  static const Color navy = Color(0xFF0A2540);           // Bleu Marine CityFlow
  static const Color secondary = Color(0xFF1E3A8A);     // Bleu institutionnel
  static const Color accent = Color(0xFF0D9488);        // Sarcelle IA

  // Traffic Status Colors
  static const Color trafficFluid = Color(0xFF10B981);   // Vert (Fluide)
  static const Color trafficModerate = Color(0xFFF59E0B);// Orange (Modéré)
  static const Color trafficHeavy = Color(0xFFEF4444);   // Rouge (Dense / Bloqué)
  static const Color trafficJam = Color(0xFFDC2626);     // Rouge critique

  // Emergency / Priority Colors
  static const Color emergency = Color(0xFFE11D48);     // Flash Urgence
  static const Color emergencyBadge = Color(0xFFFFE4E6);
  static const Color priorityRoute = Color(0xFF00875A);

  // Text Colors
  static const Color textPrimary = Color(0xFF0A2540);    // Noir / Marine très lisible
  static const Color textSecondary = Color(0xFF475569);  // Gris ardoise
  static const Color textMuted = Color(0xFF94A3B8);      // Gris clair
  static const Color textOnDark = Colors.white;

  // Gradients
  static const LinearGradient greenBannerGradient = LinearGradient(
    colors: [Color(0xFF064E3B), Color(0xFF065F46)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF00875A), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient emergencyGradient = LinearGradient(
    colors: [Color(0xFFE11D48), Color(0xFFF59E0B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
