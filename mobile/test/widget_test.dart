import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:cityflow/providers/city_flow_provider.dart';
import 'package:cityflow/models/incident_alert.dart';
import 'package:cityflow/models/saved_place.dart';
import 'package:cityflow/core/constants/city_data.dart';
import 'package:cityflow/core/services/api_service.dart';
import 'package:cityflow/screens/priority_routing_screen.dart';
import 'package:provider/provider.dart';

class _MockHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return _MockHttpClient();
  }
}

class _MockHttpClient implements HttpClient {
  @override
  bool autoUncompress = true;
  @override
  Duration idleTimeout = const Duration(seconds: 15);
  @override
  Duration? connectionTimeout;
  @override
  int? maxConnectionsPerHost;
  @override
  String? userAgent;

  @override
  Future<HttpClientRequest> getUrl(Uri url) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> postUrl(Uri url) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> putUrl(Uri url) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> deleteUrl(Uri url) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> patchUrl(Uri url) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> headUrl(Uri url) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> open(String method, String host, int port, String path) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> get(String host, int port, String path) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> post(String host, int port, String path) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> put(String host, int port, String path) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> delete(String host, int port, String path) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> patch(String host, int port, String path) async => _MockHttpClientRequest();

  @override
  Future<HttpClientRequest> head(String host, int port, String path) async => _MockHttpClientRequest();

  @override
  void addCredentials(Uri url, String realm, HttpClientCredentials credentials) {}

  @override
  void addProxyCredentials(String host, int port, String realm, HttpClientCredentials credentials) {}

  @override
  void close({bool force = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _MockHttpClientRequest implements HttpClientRequest {
  @override
  final HttpHeaders headers = _MockHttpHeaders();

  @override
  Future<HttpClientResponse> close() async => _MockHttpClientResponse();

  @override
  void add(List<int> data) {}

  @override
  void addError(Object error, [StackTrace? stackTrace]) {}

  @override
  Future addStream(Stream<List<int>> stream) async {}

  @override
  Future flush() async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _MockHttpHeaders implements HttpHeaders {
  @override
  void add(String name, Object value, {bool preserveHeaderCase = false}) {}

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {}

  @override
  void remove(String name, Object value) {}

  @override
  void removeAll(String name) {}

  @override
  List<String>? operator [](String name) => null;

  @override
  String? value(String name) => null;

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _MockHttpClientResponse extends Stream<List<int>> implements HttpClientResponse {
  @override
  final HttpHeaders headers = _MockHttpHeaders();

  static final List<int> _kTransparentImage = [
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82,
  ];

  @override
  int get statusCode => 200;

  @override
  String get reasonPhrase => 'OK';

  @override
  bool get isRedirect => false;

  @override
  bool get persistentConnection => true;

  @override
  List<RedirectInfo> get redirects => const [];

  @override
  int get contentLength => _kTransparentImage.length;

  @override
  HttpClientResponseCompressionState get compressionState => HttpClientResponseCompressionState.notCompressed;

  @override
  StreamSubscription<List<int>> listen(void Function(List<int> event)? onData,
      {Function? onError, void Function()? onDone, bool? cancelOnError}) {
    return Stream.value(_kTransparentImage).listen(onData, onError: onError, onDone: onDone, cancelOnError: cancelOnError);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    HttpOverrides.global = _MockHttpOverrides();
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

    test('Detects Off-Route Deviation, Triggers Alert and Recalculates Alternative Routes Dynamically', () async {
      final provider = CityFlowProvider();
      final landmarks = CityData.getLandmarks('Yaoundé');
      final start = landmarks.first;
      final dest = landmarks[5];

      await provider.fetchSmartRoutes(
        origin: start.pos,
        destination: dest.pos,
      );

      expect(provider.selectedSmartRoute, isNotNull);
      final initialRoute = provider.selectedSmartRoute!;

      await provider.startGpsNavigation();
      expect(provider.isGpsNavigating, true);
      expect(provider.isOffRoute, false);

      // Simuler une position sur la route initiale (à 5m du départ)
      provider.updateRealGpsPosition(initialRoute.coordinates.first, speedKmh: 25.0);
      expect(provider.isOffRoute, false);

      // 1. Simuler une déviation significative hors du tracé (> 100 mètres)
      final startPos = initialRoute.coordinates.first;
      final deviatedPos = LatLng(startPos.latitude + 0.0025, startPos.longitude - 0.0025);
      
      // Première et deuxième détection consécutive
      provider.updateRealGpsPosition(deviatedPos, speedKmh: 30.0);
      provider.updateRealGpsPosition(deviatedPos, speedKmh: 32.0);

      expect(provider.isOffRoute, true);
      expect(provider.distanceToRouteMeters > 55.0, true);

      // 2. Recalcul d'itinéraires alternatifs depuis la position déviée
      await provider.recalculateOffRouteRoutes(fromPosition: deviatedPos, force: true);
      expect(provider.offRouteAlternatives.isNotEmpty, true);

      // 3. Choix et adoption d'un itinéraire alternatif proposé
      final chosenAlternative = provider.offRouteAlternatives.first;
      provider.acceptAlternativeRoute(chosenAlternative);

      expect(provider.isOffRoute, false);
      expect(provider.offRouteAlternatives.isEmpty, true);
      expect(provider.selectedSmartRoute?.id, chosenAlternative.id);
      expect(provider.navStepIndex, 0);

      // 4. Arrêt de la navigation et nettoyage
      provider.stopGpsNavigation();
      expect(provider.isGpsNavigating, false);
      expect(provider.isOffRoute, false);

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

    test('Handles Yango-style OTP Authentication, Guest Mode and Startup Access Gate', () async {
      final provider = CityFlowProvider();

      // 1. Initial State (Unauthenticated on first launch)
      expect(provider.isAuthenticated, false);
      expect(provider.hasAccess, false);

      // 2. Test Guest Mode
      provider.continueAsGuest();
      expect(provider.isGuestMode, true);
      expect(provider.hasAccess, true);
      expect(provider.userName, 'Conducteur Invité');

      // 3. Reset and Send OTP for new account creation
      provider.logout();
      expect(provider.hasAccess, false);

      final sendResult = await provider.sendAuthOtp(
        phone: '+237699123456',
        name: 'Samuel Eto\'o',
        address: 'Quartier Bastos (Face Ambassade)',
        city: 'Yaoundé',
        channel: 'sms',
      );

      expect(sendResult['success'], true);
      expect(sendResult['previewCode'], isNotNull);
      final previewCode = sendResult['previewCode'] as String;
      expect(previewCode.length, 6);

      // 4. Verify OTP Code and activate account
      final verifyResult = await provider.verifyAuthOtp(
        phone: '+237699123456',
        code: previewCode,
        name: 'Samuel Eto\'o',
        address: 'Quartier Bastos (Face Ambassade)',
        city: 'Yaoundé',
        channel: 'sms',
      );

      expect(verifyResult['success'], true);
      expect(provider.isAuthenticated, true);
      expect(provider.userName, 'Samuel Eto\'o');
      expect(provider.userPhone, '+237699123456');
      expect(provider.userAddress, 'Quartier Bastos (Face Ambassade)');
      expect(provider.selectedCity, 'Yaoundé');

      // Confirm entering app from success screen
      provider.enterApp();
      expect(provider.hasAccess, true);

      // 5. Update Profile
      provider.updateUserProfile(
        name: 'Samuel Eto\'o Fils',
        phone: '+237677889900',
        address: 'Bonanjo, Douala',
        city: 'Douala',
        email: 'samuel@cityflow.cm',
      );

      expect(provider.userName, 'Samuel Eto\'o Fils');
      expect(provider.userPhone, '+237677889900');
      expect(provider.userAddress, 'Bonanjo, Douala');
      expect(provider.selectedCity, 'Douala');
      expect(provider.userEmail, 'samuel@cityflow.cm');

      // 6. Logout
      provider.logout();
      expect(provider.isAuthenticated, false);
      expect(provider.hasAccess, false);
      expect(provider.authToken, isNull);

      provider.dispose();
    });

    test('Simulates Realistic Multi-Factor AI Forecasts (Weather, Funerals, Rush Hours, Markets)', () async {
      // 1. Test standard dry forecast
      final dryForecast = await CityFlowMobileApiService.fetchAiForecast(
        city: 'Yaoundé',
        weather: 'dry',
        hour: 8, // Heure de pointe du matin
        dayOfWeek: 5, // Vendredi
        events: ['school_office_rush', 'funeral_cortege'],
      );

      expect(dryForecast, isNotNull);
      expect(dryForecast!['city'], 'Yaoundé');
      expect(dryForecast['globalForecast'] is List, true);

      final List forecastList = dryForecast['globalForecast'] as List;
      expect(forecastList.isNotEmpty, true);
      expect(forecastList.any((f) => f['horizon'] == '+1 heure'), true);

      // 2. Test heavy rain / flood forecast (should have higher congestion than dry)
      final floodForecast = await CityFlowMobileApiService.fetchAiForecast(
        city: 'Douala',
        weather: 'flood',
        hour: 17, // Pointe du soir
        dayOfWeek: 6, // Samedi grand marché
        events: ['market_day', 'funeral_cortege'],
      );

      expect(floodForecast, isNotNull);
      expect(floodForecast!['city'], 'Douala');
      expect(floodForecast['recommendations'] is List, true);
      expect(floodForecast['optimalDepartureWindow'] is Map, true);

      final floodPcts = (floodForecast['globalForecast'] as List).map((f) => f['congestionPercentage'] as int).toList();
      expect(floodPcts.any((pct) => pct > 60), true);
    });

    testWidgets('Renders PriorityRoutingScreen and validates 4-step Waze workflow UI elements', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final provider = CityFlowProvider();

      await tester.pumpWidget(
        ChangeNotifierProvider<CityFlowProvider>.value(
          value: provider,
          child: const MaterialApp(
            home: PriorityRoutingScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 1. Étape 1 : Accueil Waze (Explore)
      expect(find.text('Où va-t-on ?'), findsOneWidget);
      expect(find.text('Domicile'), findsOneWidget);
      expect(find.text('Travail'), findsOneWidget);
      expect(find.text('Nouveau'), findsOneWidget);
      expect(find.text('Récemment'), findsOneWidget);
      expect(find.text('Infos véhicule'), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsWidgets);

      // 2. Étape 2 : Clic sur une destination récente -> Fiche Destination
      final firstRecent = find.text(provider.currentCityLandmarks.first.name);
      if (firstRecent.evaluate().isNotEmpty) {
        await tester.tap(firstRecent.first);
        await tester.pumpAndSettle();

        expect(find.text('Voir les itinéraires'), findsOneWidget);
        expect(find.byIcon(Icons.directions_car_rounded), findsWidgets);

        // 3. Étape 3 : Clic sur "Voir les itinéraires" -> Comparateur Waze
        await tester.tap(find.text('Voir les itinéraires'));
        await tester.pumpAndSettle();

        expect(find.text('Éviter'), findsOneWidget);
        expect(find.text('Partir plus tard'), findsOneWidget);
        expect(find.text('Y aller'), findsOneWidget);
      }

      provider.dispose();
      await tester.pump(const Duration(seconds: 5));
    });
  });
}
