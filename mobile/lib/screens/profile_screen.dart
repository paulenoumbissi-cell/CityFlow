import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../providers/city_flow_provider.dart';
import 'auth_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _pushAlerts = true;
  bool _voiceGuidance = false;
  bool _offlineCacheEnabled = true;
  String _vehicleType = 'Voiture particulière';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil & Paramètres'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // 1. CARTE PROFIL UTILISATEUR
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.primary, AppColors.primaryDark],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text(
                      'PN',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Paule Noumbissi',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'paule.noumbissi@cityflow.cm',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          '🌟 Membre Citoyen Actif',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined, color: AppColors.textMuted),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AuthScreen()),
                    );
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. STATISTIQUES USAGER
          Row(
            children: [
              _buildStatTile(
                label: 'Trajets',
                value: '48',
                icon: Icons.alt_route_rounded,
                color: AppColors.primary,
              ),
              const SizedBox(width: 10),
              _buildStatTile(
                label: 'Temps Gagné',
                value: '19h',
                icon: Icons.timer_outlined,
                color: AppColors.trafficFluid,
              ),
              const SizedBox(width: 10),
              _buildStatTile(
                label: 'Éco-Points',
                value: '420',
                icon: Icons.eco_outlined,
                color: AppColors.accent,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // 3. PRÉFÉRENCES DE CIRCULATION
          _buildSectionHeader('PRÉFÉRENCES DE NAVIGATION'),
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.location_city_rounded, color: AppColors.primary),
                  title: const Text('Ville de prédilection', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: Text(provider.selectedCity, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                  onTap: () {
                    final nextCity = provider.selectedCity == 'Yaoundé' ? 'Douala' : 'Yaoundé';
                    provider.selectCity(nextCity);
                  },
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.directions_car_rounded, color: AppColors.primary),
                  title: const Text('Type de transport', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: Text(_vehicleType, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                  onTap: _selectVehicleTypeDialog,
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 4. NOTIFICATIONS ET ALERTES
          _buildSectionHeader('NOTIFICATIONS & ALERTES'),
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.notifications_active_outlined, color: AppColors.primary),
                  title: const Text('Alertes de trafic en direct', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Recevoir les notifications de bouchons et accidents', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  value: _pushAlerts,
                  activeTrackColor: AppColors.primary,
                  onChanged: (val) => setState(() => _pushAlerts = val),
                ),
                const Divider(height: 1, indent: 56),
                SwitchListTile(
                  secondary: const Icon(Icons.record_voice_over_outlined, color: AppColors.primary),
                  title: const Text('Instructions vocales', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Synthèse vocale pour le guidage sur route', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  value: _voiceGuidance,
                  activeTrackColor: AppColors.primary,
                  onChanged: (val) => setState(() => _voiceGuidance = val),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 5. CACHE ET DONNÉES
          _buildSectionHeader('DONNÉES & SYSTÈME'),
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.cloud_download_outlined, color: AppColors.primary),
                  title: const Text('Mode Hors-Ligne', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Mettre en cache les nœuds et cartes OpenStreetMap', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  value: _offlineCacheEnabled,
                  activeTrackColor: AppColors.primary,
                  onChanged: (val) => setState(() => _offlineCacheEnabled = val),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.delete_outline_rounded, color: AppColors.trafficHeavy),
                  title: const Text('Vider le cache cartographique', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.trafficHeavy)),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cache local nettoyé avec succès !'), backgroundColor: AppColors.primary),
                    );
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),

          // 6. BOUTONS D'ACTION
          OutlinedButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
              );
            },
            icon: const Icon(Icons.logout_rounded, color: AppColors.trafficHeavy),
            label: const Text('Changer de compte / Se déconnecter', style: TextStyle(color: AppColors.trafficHeavy, fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.trafficHeavy),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildStatTile({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.cardBorder),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 17,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  void _selectVehicleTypeDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Type de transport'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              'Voiture particulière',
              'Taxi urbain',
              'Moto-taxi (Bend-skin)',
              'Transport en commun / Bus',
              'Véhicule d’urgence / Officiel',
            ].map((type) {
              // ignore: deprecated_member_use
              return RadioListTile<String>(
                title: Text(type, style: const TextStyle(fontSize: 13)),
                value: type,
                // ignore: deprecated_member_use
                groupValue: _vehicleType,
                activeColor: AppColors.primary,
                // ignore: deprecated_member_use
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _vehicleType = val);
                    Navigator.of(ctx).pop();
                  }
                },
              );
            }).toList(),
          ),
        );
      },
    );
  }
}
