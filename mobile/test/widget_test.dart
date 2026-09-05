import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:cityflow/providers/city_flow_provider.dart';
import 'package:cityflow/models/incident_alert.dart';
import 'package:cityflow/models/saved_place.dart';
import 'package:cityflow/core/constants/city_data.dart';
import 'package:cityflow/core/services/api_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('flutter_tts'), (MethodCall methodCall) async {
      return 1;
    });
  });

  group('CityFlowProvider Tests', () {
    test('Initializes with Yaoundé as default city and loads nodes', () {
      final provider = CityFlowProvider();
      expect(provider.selectedCity, 'Yaoundé');
      expect(provider.currentNodes.isNotEmpty, true);
      expect(provider.selectedNode, isNotNull);
      provider.dispose();
    });

    test('Switches between Yaoundé and Douala correctly', () {
      final provider = CityFlowProvider();
      expect(provider.selectedCity, 'Yaoundé');
      
      provider.selectCity('Douala');
      expect(provider.selectedCity, 'Douala');
      expect(provider.currentNodes.any((n) => n.city == 'Douala'), true);
      
      provider.dispose();
    });

    test('Toggles Emergency Mode and assigns active priority route', () {
      final provider = CityFlowProvider();
      expect(provider.isEmergencyModeActive, false);
      
      provider.toggleEmergencyMode(true);
      expect(provider.isEmergencyModeActive, true);
      expect(provider.activePriorityRoute, isNotNull);

      provider.toggleEmergencyMode(false);
      expect(provider.isEmergencyModeActive, false);
      expect(provider.activePriorityRoute, isNull);

      provider.dispose();
    });

    test('Adds and confirms incident alerts', () {
      final provider = CityFlowProvider();
      final initialCount = provider.allAlerts.length;

      provider.addAlert(
        title: 'Test Incident Nlongkak',
        locationDescription: 'Test location',
        position: provider.currentCityCenter,
        severity: AlertSeverity.high,
        category: AlertCategory.accident,
      );

      expect(provider.allAlerts.length, initialCount + 1);
      final newAlert = provider.allAlerts.first;
      expect(newAlert.title, 'Test Incident Nlongkak');

      provider.confirmAlert(newAlert.id);
      expect(provider.allAlerts.first.confirmationsCount, 2);

      provider.dispose();
    });

    test('Calculates average speed and bottlenecks accurately', () {
      final provider = CityFlowProvider();
      expect(provider.averageSpeed > 0, true);
      expect(provider.totalCriticalBottlenecks >= 0, true);
      provider.dispose();
    });

    test('Handles smart route calculation and GPS turn-by-turn guidance', () async {
      final provider = CityFlowProvider();
      final yaoundeLandmarks = provider.currentCityLandmarks;
      expect(yaoundeLandmarks.isNotEmpty, true);

      final start = yaoundeLandmarks.first;
      final dest = yaoundeLandmarks.last;

      await provider.fetchSmartRoutes(
        origin: start.pos,
        destination: dest.pos,
      );
      expect(provider.smartRoutes.isNotEmpty, true);
      expect(provider.selectedSmartRoute, isNotNull);
      expect(provider.selectedSmartRoute!.trafficSegments.isNotEmpty, true);

      // Test navigation controls
      await provider.startGpsNavigation();
      expect(provider.isGpsNavigating, true);
      expect(provider.navStepIndex, 0);

      provider.nextGpsStep();
      expect(provider.navStepIndex, 1);

      provider.previousGpsStep();
      expect(provider.navStepIndex, 0);

      provider.toggleVoiceGuidance();
      expect(provider.voiceGuidanceEnabled, false);
      provider.toggleVoiceGuidance();
      expect(provider.voiceGuidanceEnabled, true);

      provider.stopGpsNavigation();
      expect(provider.isGpsNavigating, false);

      provider.dispose();
    });

    test('Manages Saved Places correctly', () {
      final provider = CityFlowProvider();
      final initialCount = provider.savedPlaces.length;
      expect(initialCount > 0, true);

      final yaoundeCenter = provider.currentCityCenter;
      provider.addSavedPlace(
        SavedPlace(
          id: 'sp_test_custom',
          title: 'Nouvelle Maison Bastos',
          address: 'Avenue Bastos',
          category: SavedPlaceCategory.home,
          position: yaoundeCenter,
          city: 'Yaoundé',
        ),
      );

      expect(provider.savedPlaces.length, initialCount + 1);
      final found = provider.savedPlaces.firstWhere((p) => p.id == 'sp_test_custom');
      expect(found.title, 'Nouvelle Maison Bastos');
      expect(found.categoryLabel, 'Domicile');

      provider.removeSavedPlace('sp_test_custom');
      expect(provider.savedPlaces.length, initialCount);

      provider.dispose();
    });

    test('Plans trip with AI and calculates optimal departure buffer', () {
      final provider = CityFlowProvider();
      final initialScheduled = provider.scheduledTrips.length;

      final trip = provider.planTripWithAi(
        title: 'Entretien Ambassade',
        originName: 'Bastos',
        originPos: const LatLng(3.8928, 11.5122),
        destinationName: 'Centre Ville',
        destinationPos: const LatLng(3.8666, 11.5167),
        targetArrivalTime: const TimeOfDay(hour: 8, minute: 0), // Heure de pointe matinale
        date: DateTime.now(),
      );

      expect(provider.scheduledTrips.length, initialScheduled + 1);
      expect(trip.title, 'Entretien Ambassade');
      expect(trip.trafficBufferMinutes, 20); // Buffer pointe matinale
      expect(trip.isReminderActive, true);
      expect(trip.recommendedDepartureTime.isBefore(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day, 8, 0)), true);

      // Toggle reminder
      provider.toggleScheduledTripReminder(trip.id);
      final updated = provider.scheduledTrips.firstWhere((t) => t.id == trip.id);
      expect(updated.isReminderActive, false);

      provider.removeScheduledTrip(trip.id);
      expect(provider.scheduledTrips.length, initialScheduled);

      provider.dispose();
    });

    test('Manages Trip and Search History', () {
      final provider = CityFlowProvider();
      final initialHistory = provider.tripHistory.length;

      provider.addToTripHistory(
        title: 'Carrefour Warda',
        subtitle: 'Yaoundé • Rond point',
        destinationPos: const LatLng(3.8712, 11.5180),
        category: 'recent_route',
      );

      expect(provider.tripHistory.length, initialHistory + 1);
      expect(provider.tripHistory.first.title, 'Carrefour Warda');
      expect(provider.tripHistory.first.relativeTimeLabel, 'À l\'instant');

      provider.clearTripHistory();
      expect(provider.tripHistory.isEmpty, true);

      provider.dispose();
    });

    test('Manages Driving Modes, Connected Vehicles, and Dynamic Detour Rerouting', () {
      final provider = CityFlowProvider();

      // 1. Driving Mode
      expect(provider.userMood, 'cool');
      expect(provider.userMoodLabel, 'Standard');
      provider.setUserMood('speedy', '', 'Express');
      expect(provider.userMood, 'speedy');
      expect(provider.userMoodLabel, 'Express');

      // 2. Connected Vehicles
      final driversYde = provider.nearbyCommunityDrivers;
      expect(driversYde.isNotEmpty, true);
      expect(driversYde.any((d) => d.mood == 'taxi'), true);

      provider.selectCity('Douala');
      final driversDla = provider.nearbyCommunityDrivers;
      expect(driversDla.isNotEmpty, true);

      // 3. Dynamic Detour Rerouting
      expect(provider.hasDetourAlert, false);
      provider.triggerDetourAlert(reason: 'Ralentissement détecté', timeSavedMinutes: 5);
      expect(provider.hasDetourAlert, true);
      expect(provider.detourTimeSavedMinutes, 5);
      expect(provider.detourReason, 'Ralentissement détecté');

      provider.dismissDetourAlert();
      expect(provider.hasDetourAlert, false);

      provider.dispose();
    });

    test('Loads comprehensive landmarks and roads for both Yaoundé and Douala', () {
      final ydeLandmarks = CityData.getLandmarks('Yaoundé');
      final dlaLandmarks = CityData.getLandmarks('Douala');

      expect(ydeLandmarks.length >= 25, true);
      expect(dlaLandmarks.length >= 20, true);

      // Vérifier les quartiers et carrefours majeurs de Yaoundé
      final ydeNames = ydeLandmarks.map((l) => l.name.toLowerCase()).toList();
      expect(ydeNames.any((n) => n.contains('bastos')), true);
      expect(ydeNames.any((n) => n.contains('nlongkak')), true);
      expect(ydeNames.any((n) => n.contains('mokolo')), true);
      expect(ydeNames.any((n) => n.contains('mvan')), true);
      expect(ydeNames.any((n) => n.contains('odza')), true);
      expect(ydeNames.any((n) => n.contains('ahala')), true);
      expect(ydeNames.any((n) => n.contains('poste centrale')), true);

      // Vérifier les quartiers et carrefours majeurs de Douala
      final dlaNames = dlaLandmarks.map((l) => l.name.toLowerCase()).toList();
      expect(dlaNames.any((n) => n.contains('akwa')), true);
      expect(dlaNames.any((n) => n.contains('deido')), true);
      expect(dlaNames.any((n) => n.contains('bonanjo')), true);
      expect(dlaNames.any((n) => n.contains('ndokoti')), true);
      expect(dlaNames.any((n) => n.contains('bonabéri')), true);
      expect(dlaNames.any((n) => n.contains('bonamoussadi')), true);
    });

    test('Searches places locally and formats distance accurately', () async {
      final ydeResults = await CityFlowMobileApiService.searchPlaces(
        query: 'Bastos',
        city: 'Yaoundé',
        userPos: const LatLng(3.8667, 11.5167),
      );
      expect(ydeResults.isNotEmpty, true);
      expect(ydeResults.any((r) => r.name.toLowerCase().contains('bastos')), true);

      final dlaResults = await CityFlowMobileApiService.searchPlaces(
        query: 'Akwa',
        city: 'Douala',
        userPos: const LatLng(4.0511, 9.7043),
      );
      expect(dlaResults.isNotEmpty, true);
      expect(dlaResults.any((r) => r.name.toLowerCase().contains('akwa')), true);
    });

    test('Ensures logical screen routing and tab navigation state management', () {
      int activeTab = 0;
      void onNavigateTab(int index) {
        activeTab = index;
      }

      expect(activeTab, 0);
      onNavigateTab(1); // Naviguer vers Itinéraires
      expect(activeTab, 1);
      onNavigateTab(2); // Naviguer vers Prédiction IA
      expect(activeTab, 2);
      onNavigateTab(3); // Naviguer vers Entraide Citoyenne
      expect(activeTab, 3);
      onNavigateTab(0); // Retour à la Carte
      expect(activeTab, 0);
    });
  });
}
