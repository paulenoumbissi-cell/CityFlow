import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../constants/city_data.dart';

class LocationResult {
  final LatLng position;
  final String detectedCity;
  final double distanceKm;
  final bool isGpsLive;
  final String? errorMessage;

  const LocationResult({
    required this.position,
    required this.detectedCity,
    required this.distanceKm,
    this.isGpsLive = true,
    this.errorMessage,
  });
}

class LocationService {
  static final Distance _distance = const Distance();

  /// Détecte automatiquement la position GPS et détermine la métropole la plus proche (Yaoundé ou Douala)
  static Future<LocationResult> detectUserCity() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return _fallbackResult(
          errorMessage: 'Service de localisation désactivé sur l\'appareil',
        );
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return _fallbackResult(
            errorMessage: 'Permission de localisation refusée par l\'utilisateur',
          );
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return _fallbackResult(
          errorMessage: 'Permissions de localisation refusées de façon permanente',
        );
      }

      // Récupération de la position GPS en direct
      final Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 8),
        ),
      );

      final userLatLng = LatLng(position.latitude, position.longitude);

      // Calcul de la distance vers Yaoundé et vers Douala
      final distanceToYaounde = _distance.as(
        LengthUnit.Kilometer,
        userLatLng,
        CityData.yaoundeCenter,
      );

      final distanceToDouala = _distance.as(
        LengthUnit.Kilometer,
        userLatLng,
        CityData.doualaCenter,
      );

      final isCloserToDouala = distanceToDouala < distanceToYaounde;
      final detectedCity = isCloserToDouala ? 'Douala' : 'Yaoundé';
      final shortestDistance = isCloserToDouala ? distanceToDouala : distanceToYaounde;

      return LocationResult(
        position: userLatLng,
        detectedCity: detectedCity,
        distanceKm: shortestDistance,
        isGpsLive: true,
      );
    } catch (e) {
      return _fallbackResult(
        errorMessage: 'Impossible d\'obtenir le signal GPS: $e',
      );
    }
  }

  static LocationResult _fallbackResult({String? errorMessage}) {
    return LocationResult(
      position: CityData.yaoundeCenter,
      detectedCity: 'Yaoundé',
      distanceKm: 0,
      isGpsLive: false,
      errorMessage: errorMessage,
    );
  }
}
