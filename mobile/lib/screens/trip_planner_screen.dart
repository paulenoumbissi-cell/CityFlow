import 'package:flutter/material.dart';
import 'traffic_prediction_screen.dart';

/// Écran unifié de Planification de trajet & Prédictions IA
/// Identique et synchronisé sur tous les points d'entrée (Onglet Planifier, Drawer, Carte).
class TripPlannerScreen extends StatelessWidget {
  final Function(int)? onNavigateTab;
  const TripPlannerScreen({super.key, this.onNavigateTab});

  @override
  Widget build(BuildContext context) {
    return TrafficPredictionScreen(onNavigateTab: onNavigateTab);
  }
}
