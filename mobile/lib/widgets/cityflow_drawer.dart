import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../screens/trip_planner_screen.dart';
import '../screens/saved_places_screen.dart';
import '../screens/trip_history_screen.dart';

class CityFlowDrawer extends StatelessWidget {
  final Function(int)? onNavigateTab;

  const CityFlowDrawer({
    super.key,
    this.onNavigateTab,
  });

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final savedCount = provider.savedPlaces.length;
    final scheduledCount = provider.scheduledTrips.length;
    final points = provider.citizenPoints;

    return Drawer(
      backgroundColor: const Color(0xFF0F172A), // Bleu Nuit Slate Premium
      child: SafeArea(
        top: false,
        bottom: true,
        child: Column(
          children: [
            // ==========================================
            // 1. EN-TÊTE CONDUCTEUR / CITOYEN STYLE WAZE PRO
            // ==========================================
            Container(
              padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF0A2540), Color(0xFF064E3B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border(
                  bottom: BorderSide(color: Color(0x3300875A), width: 1.5),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Avatar avec anneau de niveau
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFF00875A), Color(0xFF10B981), Color(0xFF38BDF8)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF00875A).withValues(alpha: 0.4),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 26,
                          backgroundColor: const Color(0xFF0F172A),
                          child: Text(
                            provider.selectedCity.substring(0, 1),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  'Conducteur CityFlow',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFF10B981), width: 0.8),
                                  ),
                                  child: const Text(
                                    'PRO',
                                    style: TextStyle(
                                      color: Color(0xFF10B981),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${provider.selectedCity} • Mode : ${provider.userMoodLabel}',
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Carte de Réputation & XP Citoyen
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.stars_rounded, color: Color(0xFFFBBF24), size: 18),
                                const SizedBox(width: 6),
                                Text(
                                  '$points XP Citoyen',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const Text(
                              'Niveau 3 : Éclaireur',
                              style: TextStyle(
                                color: Color(0xFF38BDF8),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: (points % 500) / 500.0,
                            minHeight: 6,
                            backgroundColor: Colors.white.withValues(alpha: 0.15),
                            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00875A)),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // SÉLECTEUR DE MODE DE CONDUITE (STYLE ÉPURÉ SANS STICKERS)
                  const Text(
                    'PROFIL DE CONDUITE',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildDriveModeChip(context, provider, 'cool', Icons.directions_car_rounded, 'Standard'),
                        const SizedBox(width: 6),
                        _buildDriveModeChip(context, provider, 'eco', Icons.eco_rounded, 'Éco'),
                        const SizedBox(width: 6),
                        _buildDriveModeChip(context, provider, 'speedy', Icons.bolt_rounded, 'Express'),
                        const SizedBox(width: 6),
                        _buildDriveModeChip(context, provider, 'taxi', Icons.local_taxi_rounded, 'Taxi Pro'),
                        const SizedBox(width: 6),
                        _buildDriveModeChip(context, provider, 'sos', Icons.emergency_rounded, 'Prioritaire'),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ==========================================
            // 2. LISTE DES MENUS PRINCIPAUX
            // ==========================================
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                children: [
                  _buildSectionTitle('NAVIGATION & COCKPIT'),
                  _buildDrawerTile(
                    context: context,
                    icon: Icons.map_rounded,
                    title: 'Carte & Trafic Live',
                    subtitle: 'Vue d\'ensemble des axes routiers',
                    onTap: () {
                      Navigator.pop(context);
                      onNavigateTab?.call(0);
                    },
                  ),
                  _buildDrawerTile(
                    context: context,
                    icon: Icons.alt_route_rounded,
                    title: 'Itinéraires & Guidage HUD',
                    subtitle: 'Multi-critères avec vitesse et voix',
                    onTap: () {
                      Navigator.pop(context);
                      onNavigateTab?.call(1);
                    },
                  ),
                  _buildDrawerTile(
                    context: context,
                    icon: Icons.access_time_filled_rounded,
                    title: 'Planificateur IA de Départ',
                    subtitle: 'Heure idéale & alertes de trafic',
                    badge: scheduledCount > 0 ? '$scheduledCount' : 'IA',
                    badgeColor: const Color(0xFF00875A),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => TripPlannerScreen(onNavigateTab: onNavigateTab)),
                      );
                    },
                  ),
                  _buildDrawerTile(
                    context: context,
                    icon: Icons.bookmark_rounded,
                    title: 'Lieux Enregistrés',
                    subtitle: 'Domicile, Travail & Favoris',
                    badge: '$savedCount',
                    badgeColor: const Color(0xFF0284C7),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => SavedPlacesScreen(onNavigateTab: onNavigateTab)),
                      );
                    },
                  ),
                  _buildDrawerTile(
                    context: context,
                    icon: Icons.history_rounded,
                    title: 'Historique des Trajets',
                    subtitle: 'Recherches et destinations récentes',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => TripHistoryScreen(onNavigateTab: onNavigateTab)),
                      );
                    },
                  ),

                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Divider(color: Color(0x22FFFFFF), height: 1),
                  ),

                  _buildSectionTitle('COMMUNAUTÉ & IA'),
                  _buildDrawerTile(
                    context: context,
                    icon: Icons.handshake_rounded,
                    title: 'Entraide & Signalements',
                    subtitle: 'Signalez bouchons, police et nids-de-poule',
                    badge: '+15 XP',
                    badgeColor: const Color(0xFFEA580C),
                    onTap: () {
                      Navigator.pop(context);
                      onNavigateTab?.call(3);
                    },
                  ),
                  _buildDrawerTile(
                    context: context,
                    icon: Icons.auto_awesome_rounded,
                    title: 'Prédiction IA & Météo',
                    subtitle: 'Horizons 30 min et heures de pointe',
                    onTap: () {
                      Navigator.pop(context);
                      onNavigateTab?.call(2);
                    },
                  ),
                ],
              ),
            ),

            // ==========================================
            // 3. PIED DE PAGE DRAWER
            // ==========================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: const BoxDecoration(
                color: Color(0xFF0B132B),
                border: Border(top: BorderSide(color: Color(0x22FFFFFF), width: 1)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: provider.isWsConnected ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (provider.isWsConnected ? const Color(0xFF10B981) : const Color(0xFFF59E0B))
                              .withValues(alpha: 0.6),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      provider.isWsConnected ? 'Synchronisation Live Active' : 'Mode Autonome IA',
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Text(
                    'CityFlow v2.4',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
      child: Text(
        title,
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildDrawerTile({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    String? badge,
    Color? badgeColor,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        dense: true,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: const Color(0xFF38BDF8), size: 20),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
            if (badge != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeColor ?? const Color(0xFF00875A),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 10,
                  ),
                ),
              ),
            ],
          ],
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF475569), size: 18),
        onTap: onTap,
      ),
    );
  }

  Widget _buildDriveModeChip(
    BuildContext context,
    CityFlowProvider provider,
    String modeKey,
    IconData icon,
    String label,
  ) {
    final isSelected = provider.userMood == modeKey;
    return GestureDetector(
      onTap: () {
        provider.setUserMood(modeKey, '', label);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Profil de conduite activé : $label'),
            duration: const Duration(milliseconds: 1200),
            backgroundColor: const Color(0xFF00875A),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF00875A) : Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF10B981) : Colors.white.withValues(alpha: 0.15),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? Colors.white : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFFCBD5E1),
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

