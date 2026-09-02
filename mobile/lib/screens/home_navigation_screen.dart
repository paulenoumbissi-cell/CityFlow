import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../core/constants/app_colors.dart';
import 'dashboard_screen.dart';
import 'map_screen.dart';
import 'priority_routing_screen.dart';
import 'traffic_prediction_screen.dart';
import 'alerts_screen.dart';

class HomeNavigationScreen extends StatefulWidget {
  const HomeNavigationScreen({super.key});

  @override
  State<HomeNavigationScreen> createState() => _HomeNavigationScreenState();
}

class _HomeNavigationScreenState extends State<HomeNavigationScreen> {
  int _currentIndex = 0;

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final activeAlerts = provider.activeAlertsCount;

    final List<Widget> screens = [
      DashboardScreen(onNavigateTab: _onTabTapped),
      MapScreen(onNavigateTab: _onTabTapped),
      PriorityRoutingScreen(onNavigateTab: _onTabTapped),
      const TrafficPredictionScreen(),
      const AlertsScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: AppColors.cardBorder, width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabTapped,
          backgroundColor: Colors.white,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textMuted,
          type: BottomNavigationBarType.fixed,
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_rounded),
              label: 'Accueil',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.map_outlined),
              activeIcon: Icon(Icons.map_rounded),
              label: 'Carte',
            ),
            BottomNavigationBarItem(
              icon: Icon(
                provider.isEmergencyModeActive ? Icons.flash_on_rounded : Icons.alt_route_outlined,
                color: provider.isEmergencyModeActive ? AppColors.emergency : null,
              ),
              activeIcon: Icon(
                provider.isEmergencyModeActive ? Icons.flash_on_rounded : Icons.alt_route_rounded,
                color: provider.isEmergencyModeActive ? AppColors.emergency : AppColors.primary,
              ),
              label: 'Itinéraires',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.auto_awesome_outlined),
              activeIcon: Icon(Icons.auto_awesome_rounded),
              label: 'Prédiction',
            ),
            BottomNavigationBarItem(
              icon: Badge(
                isLabelVisible: activeAlerts > 0,
                label: Text('$activeAlerts'),
                backgroundColor: AppColors.emergency,
                child: const Icon(Icons.notifications_outlined),
              ),
              activeIcon: Badge(
                isLabelVisible: activeAlerts > 0,
                label: Text('$activeAlerts'),
                backgroundColor: AppColors.emergency,
                child: const Icon(Icons.notifications_rounded),
              ),
              label: 'Alertes',
            ),
          ],
        ),
      ),
    );
  }
}
