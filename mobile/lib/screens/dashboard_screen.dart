import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/traffic_node.dart';
import '../core/constants/app_colors.dart';
import '../widgets/cityflow_brand_header.dart';
import '../widgets/city_selector.dart';
import '../widgets/pulsing_traffic_marker.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int) onNavigateTab;
  const DashboardScreen({super.key, required this.onNavigateTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final TextEditingController _destinationController = TextEditingController();

  Color _getCongestionColor(CongestionLevel level) {
    switch (level) {
      case CongestionLevel.fluid:
        return AppColors.trafficFluid;
      case CongestionLevel.moderate:
        return AppColors.trafficModerate;
      case CongestionLevel.heavy:
        return AppColors.trafficHeavy;
      case CongestionLevel.jammed:
        return AppColors.trafficJam;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final nodes = provider.currentNodes;
    final isYaounde = provider.selectedCity == 'Yaoundé';

    return Scaffold(
      appBar: AppBar(
        title: const CityFlowBrandHeader(logoSize: 32),
        actions: [
          const CitySelector(),
          const SizedBox(width: 8),
          IconButton(
            icon: Badge(
              isLabelVisible: provider.activeAlertsCount > 0,
              label: Text('${provider.activeAlertsCount}'),
              backgroundColor: AppColors.emergency,
              child: const Icon(Icons.notifications_none_rounded, color: AppColors.navy),
            ),
            onPressed: () => widget.onNavigateTab(4), // Vers alertes
          ),
          Container(
            margin: const EdgeInsets.only(right: 14, left: 4),
            width: 34,
            height: 34,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text(
                'PN',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // 1. Tag Mobilité intelligente
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('🚦', style: TextStyle(fontSize: 12)),
                    SizedBox(width: 5),
                    Text(
                      'Mobilité intelligente',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 2. Hero Title & Subtitle
          const Text(
            'Votre trajet,\nplus simple et plus intelligent.',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 26,
              fontWeight: FontWeight.w900,
              height: 1.15,
              letterSpacing: -0.8,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'CityFlow vous aide à comprendre le trafic, anticiper les congestions et choisir les meilleurs itinéraires à Yaoundé et Douala.',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.4,
            ),
          ),

          const SizedBox(height: 16),

          // 3. Search Box Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('DÉPART', style: TextStyle(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
                          Text('Votre position actuelle', style: TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.only(left: 4, top: 4, bottom: 4),
                  child: Divider(color: AppColors.cardBorder),
                ),
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: AppColors.emergency,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('DESTINATION', style: TextStyle(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
                          TextField(
                            controller: _destinationController,
                            decoration: InputDecoration(
                              hintText: isYaounde ? 'Où souhaitez-vous aller ? (ex: Bastos)' : 'Où souhaitez-vous aller ? (ex: Akwa)',
                              hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(vertical: 4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => widget.onNavigateTab(2), // Vers itinéraires
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Rechercher',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 4. Quick Status Cards (Horizontal List)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildQuickCard(
                  iconBg: AppColors.primaryLight,
                  iconColor: AppColors.primary,
                  icon: Icons.circle,
                  title: 'Trafic actuel',
                  value: 'Modéré (68% fluide)',
                ),
                const SizedBox(width: 10),
                _buildQuickCard(
                  iconBg: AppColors.surfaceLight,
                  iconColor: AppColors.navy,
                  icon: Icons.location_on_rounded,
                  title: 'Ville active',
                  value: provider.selectedCity,
                ),
                const SizedBox(width: 10),
                _buildQuickCard(
                  iconBg: const Color(0xFFF3E8FF),
                  iconColor: const Color(0xFF9333EA),
                  icon: Icons.auto_awesome_rounded,
                  title: 'Prévision IA',
                  value: 'Dans 30 min (86% dense)',
                ),
              ],
            ),
          ),

          const SizedBox(height: 22),

          // 5. Section "Situation du trafic" (Mini Map)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('LOCALISATION', style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                        SizedBox(height: 2),
                        Text('Situation du trafic', style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: () => widget.onNavigateTab(1), // Vers carte
                      icon: const Icon(Icons.fullscreen_rounded, size: 16, color: AppColors.primary),
                      label: const Text('Plein écran', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    height: 180,
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: provider.currentCityCenter,
                        initialZoom: 12.8,
                        interactionOptions: const InteractionOptions(
                          flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                        ),
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.cityflow.mobile',
                        ),
                        MarkerLayer(
                          markers: nodes.map((node) {
                            return Marker(
                              point: node.position,
                              width: 46,
                              height: 46,
                              child: PulsingTrafficMarker(
                                node: node,
                                isSelected: false,
                                onTap: () {
                                  provider.selectNode(node);
                                  widget.onNavigateTab(1);
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Legend
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildLegendItem('Fluide', AppColors.trafficFluid),
                    const SizedBox(width: 16),
                    _buildLegendItem('Modéré', AppColors.trafficModerate),
                    const SizedBox(width: 16),
                    _buildLegendItem('Dense / Saturé', AppColors.trafficHeavy),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 6. Analyse État du Trafic & Jauge
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ANALYSE', style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                        SizedBox(height: 2),
                        Text('État du trafic', style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.emergencyBadge,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.circle, color: AppColors.emergency, size: 8),
                          SizedBox(width: 4),
                          Text('LIVE', style: TextStyle(color: AppColors.emergency, fontSize: 10, fontWeight: FontWeight.w900)),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Gauge row
                Row(
                  children: [
                    // Circular Progress Display
                    SizedBox(
                      width: 76,
                      height: 76,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const CircularProgressIndicator(
                            value: 0.68,
                            strokeWidth: 8,
                            backgroundColor: AppColors.surfaceLight,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.trafficModerate),
                          ),
                          const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '68%',
                                style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                'fluidité',
                                style: TextStyle(color: AppColors.textMuted, fontSize: 9),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Trafic modéré',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'La circulation est globalement normale, avec quelques ralentissements sur les nœuds stratégiques.',
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 11, height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),
                const Divider(color: AppColors.cardBorder),
                const SizedBox(height: 8),

                // Quartiers Progress Bars
                if (isYaounde) ...[
                  _buildNeighborhoodRow('Centre-ville (Poste Centrale)', 0.85, 'Dense', AppColors.trafficHeavy),
                  _buildNeighborhoodRow('Bastos / Dragages', 0.55, 'Modéré', AppColors.trafficModerate),
                  _buildNeighborhoodRow('Mvan / Nsimalen', 0.30, 'Fluide', AppColors.trafficFluid),
                ] else ...[
                  _buildNeighborhoodRow('Carrefour Ndokotti', 0.95, 'Critique', AppColors.trafficHeavy),
                  _buildNeighborhoodRow('Rond-point Deïdo / Wouri', 0.70, 'Dense', AppColors.trafficModerate),
                  _buildNeighborhoodRow('Akwa / Bonanjo', 0.40, 'Fluide', AppColors.trafficFluid),
                ],
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 7. Intelligence CityFlow : Anticipez le trafic (Dark Green Banner Card)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: AppColors.greenBannerGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryDark.withValues(alpha: 0.3),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'INTELLIGENCE CITYFLOW',
                          style: TextStyle(
                            color: Color(0xFF6EE7B7),
                            fontWeight: FontWeight.w900,
                            fontSize: 10,
                            letterSpacing: 0.8,
                          ),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Anticipez le trafic',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Consultez l\'évolution estimée de la circulation pour mieux planifier votre déplacement.',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
                ),
                const SizedBox(height: 16),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildForecastSlot('Maintenant', '68%', '• Modéré', AppColors.trafficModerate),
                      const SizedBox(width: 8),
                      _buildForecastSlot('Dans 15 min', '74%', '• Modéré', AppColors.trafficModerate),
                      const SizedBox(width: 8),
                      _buildForecastSlot('Dans 30 min', '86%', '• Dense', AppColors.trafficHeavy),
                      const SizedBox(width: 8),
                      _buildForecastSlot('Dans 60 min', '61%', '• Modéré', AppColors.trafficFluid),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 8. Mobilité : Votre itinéraire intelligent
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'MOBILITÉ',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w900,
                    fontSize: 10,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Votre itinéraire intelligent',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'CityFlow prend en compte l\'état du trafic pour vous proposer une route adaptée.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.circle, color: AppColors.primary, size: 10),
                          const SizedBox(width: 8),
                          const Text('Départ : ', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                          const Text('Votre position', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 12)),
                          const Spacer(),
                          Text(isYaounde ? '6.8 km' : '7.9 km', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
                          const Spacer(),
                          const Icon(Icons.location_on_rounded, color: AppColors.emergency, size: 12),
                          const SizedBox(width: 4),
                          const Text('Destination : ', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                          Text(isYaounde ? 'Centre-ville' : 'Akwa', style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Text(
                                isYaounde ? '22 min' : '28 min',
                                style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w900, fontSize: 16),
                              ),
                              const SizedBox(width: 6),
                              const Text('Temps estimé', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                            ],
                          ),
                          ElevatedButton.icon(
                            onPressed: () => widget.onNavigateTab(2),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                            icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                            label: const Text('Voir l\'itinéraire', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 30),

          // 9. Footer
          Center(
            child: Column(
              children: [
                const CityFlowBrandHeader(logoSize: 26, showSlogan: false),
                const SizedBox(height: 4),
                const Text(
                  'Votre mobilité, notre intelligence.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontStyle: FontStyle.italic),
                ),
                const SizedBox(height: 6),
                const Text(
                  '© 2026 CityFlow — Yaoundé & Douala',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 10),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickCard({
    required Color iconBg,
    required Color iconColor,
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Container(
      width: 145,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 16),
          ),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
      ],
    );
  }

  Widget _buildNeighborhoodRow(String name, double progress, String label, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(name, style: const TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
              Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.surfaceLight,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForecastSlot(String time, String percentage, String status, Color color) {
    return Container(
      width: 105,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            time,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 10),
          ),
          const SizedBox(height: 4),
          Text(
            percentage,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            status,
            style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
