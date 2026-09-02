import 'package:flutter_test/flutter_test.dart';
import 'package:cityflow/providers/city_flow_provider.dart';
import 'package:cityflow/models/incident_alert.dart';

void main() {
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
  });
}
