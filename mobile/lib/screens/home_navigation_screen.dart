import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cityflow/providers/city_flow_provider.dart';
import 'package:cityflow/core/constants/app_colors.dart';
import 'package:cityflow/screens/map_screen.dart';
import 'package:cityflow/screens/priority_routing_screen.dart';
import 'package:cityflow/screens/traffic_prediction_screen.dart';
import 'package:cityflow/screens/citizen_reports_screen.dart';

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

    final List<Widget> screens = [
      MapScreen(onNavigateTab: _onTabTapped),
      PriorityRoutingScreen(onNavigateTab: _onTabTapped),
      TrafficPredictionScreen(onNavigateTab: _onTabTapped),
      CitizenReportsScreen(onNavigateTab: _onTabTapped),
    ];

    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _currentIndex != 0) {
          setState(() {
            _currentIndex = 0;
          });
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: screens,
        ),
        bottomNavigationBar: provider.isGpsNavigating
            ? null
            : Container(
                decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(color: AppColors.cardBorder.withValues(alpha: 0.8), width: 1),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  // TAB 1: CARTE (ACCUEIL GOOGLE MAPS)
                  _buildNavItem(
                    index: 0,
                    icon: Icons.map_outlined,
                    activeIcon: Icons.map_rounded,
                    label: 'Carte',
                  ),

                  // TAB 2: ITINÉRAIRES (PROPOSITIONS TEMPS RÉEL SUR LA CARTE & GUIDAGE)
                  _buildNavItem(
                    index: 1,
                    icon: Icons.alt_route_outlined,
                    activeIcon: Icons.alt_route_rounded,
                    label: 'Itinéraires',
                    isEmergency: provider.isEmergencyModeActive,
                  ),

                  // TAB 3: PRÉDICTION IA (MÉTÉO, HORIZONS & TENDANCES)
                  _buildNavItem(
                    index: 2,
                    icon: Icons.auto_awesome_outlined,
                    activeIcon: Icons.auto_awesome_rounded,
                    label: 'Prédiction',
                  ),

                  // TAB 4: ENTRAIDE (SIGNALEMENT CITOYEN & RÉCOMPENSES)
                  _buildNavItem(
                    index: 3,
                    icon: Icons.handshake_outlined,
                    activeIcon: Icons.handshake_rounded,
                    label: 'Entraide',
                    isPill: true,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    bool isPill = false,
    bool isEmergency = false,
  }) {
    final isSelected = _currentIndex == index;

    return GestureDetector(
      onTap: () => _onTabTapped(index),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: isPill
                  ? const EdgeInsets.symmetric(horizontal: 20, vertical: 4)
                  : const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected
                    ? (isEmergency
                        ? const Color(0xFFFFE4E6)
                        : const Color(0xFFC2E7FF)) // Bleu Cyan Material 3 Google Maps
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                isSelected ? activeIcon : icon,
                color: isSelected
                    ? (isEmergency ? const Color(0xFFDC2626) : const Color(0xFF001D35))
                    : const Color(0xFF475569),
                size: 22,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected
                    ? (isEmergency ? const Color(0xFFDC2626) : const Color(0xFF001D35))
                    : const Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
