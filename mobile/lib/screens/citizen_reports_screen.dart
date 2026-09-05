import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/citizen_report.dart';
import '../models/citizen_reward.dart';
import '../core/constants/app_colors.dart';

class CitizenReportsScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const CitizenReportsScreen({super.key, this.onNavigateTab});

  @override
  State<CitizenReportsScreen> createState() => _CitizenReportsScreenState();
}

class _CitizenReportsScreenState extends State<CitizenReportsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  CitizenReportCategory? _selectedCategoryFilter;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // ===================================================================
  // 1. ROUE / GRILLE DE SIGNALEMENT WAZE (1-CLICK REPORT WHEEL)
  // ===================================================================
  void _showWazeReportMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _WazeReportGridModal(
        onReportSubmitted: (category, severity, title, location) async {
          final provider = context.read<CityFlowProvider>();
          final scaffoldMessenger = ScaffoldMessenger.of(context);

          final ok = await provider.addCitizenReport(
            title: title,
            locationDescription: location,
            category: category,
            severity: severity,
          );

          scaffoldMessenger.showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.white),
                  const SizedBox(width: 8),
                  Text(
                    ok
                        ? 'Signalement Waze envoyé (+25 points) !'
                        : 'Signalement enregistré en local.',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFF059669),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        },
      ),
    );
  }

  void _showRedeemSuccessDialog(BuildContext context, RewardCoupon coupon) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🎉', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              const Text('Félicitations !', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text(
                'Vous avez débloqué "${coupon.title}"',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: Color(0xFF006666), fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF006666).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF006666).withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    const Text('Code avantage partenaire :', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    const SizedBox(height: 6),
                    SelectableText(
                      coupon.code,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF006666),
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF006666),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Compris, merci !', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final reports = provider.currentCityCitizenReports;
    final profile = provider.citizenProfile;
    final catalog = provider.rewardsCatalog;

    final filteredReports = _selectedCategoryFilter == null
        ? reports
        : reports.where((r) => r.category == _selectedCategoryFilter).toList();

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        } else {
          widget.onNavigateTab?.call(0);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Retour à la carte',
            onPressed: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              } else {
                widget.onNavigateTab?.call(0);
              }
            },
          ),
          title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF006666).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.handshake_rounded, color: Color(0xFF006666), size: 22),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Entraide & Signalements',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy),
                ),
                Text(
                  '${provider.selectedCity} • ${provider.citizenPoints} pts Wazer',
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => provider.refreshCitizenData(),
            tooltip: 'Actualiser',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF006666),
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: const Color(0xFF006666),
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: [
            Tab(
              icon: const Icon(Icons.campaign_rounded, size: 20),
              text: 'Signalements Live (${reports.length})',
            ),
            Tab(
              icon: const Icon(Icons.emoji_events_rounded, size: 20),
              text: 'Mes Récompenses (${provider.citizenPoints} pts)',
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_waze_report',
        backgroundColor: const Color(0xFF006666),
        foregroundColor: Colors.white,
        elevation: 6,
        icon: const Icon(Icons.add_location_alt_rounded, size: 22),
        label: const Text(
          'SIGNALER (+25 PTS)',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5, fontSize: 13),
        ),
        onPressed: () => _showWazeReportMenu(context),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // =========================================================
          // TAB 1 : FLUX DE SIGNALEMENTS LIVE STYLE WAZE
          // =========================================================
          RefreshIndicator(
            onRefresh: () => provider.refreshCitizenData(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
              children: [
                // 1. CARTE PROFIL CITOYEN / HUMEUR WAZE
                _buildWazeProfileCard(profile, provider),
                const SizedBox(height: 16),

                // 2. BANNIÈRE BOUTON GÉANT SIGNALER WAZE
                GestureDetector(
                  onTap: () => _showWazeReportMenu(context),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF006666), Color(0xFF008080)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF006666).withValues(alpha: 0.35),
                          blurRadius: 14,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Signaler un événement',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Bouchon, accident, police, danger... Gagnez +25 pts',
                                style: TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 3. FILTRES DE CATÉGORIES DÉROULANTS
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: const Text('Tous'),
                          selected: _selectedCategoryFilter == null,
                          selectedColor: const Color(0xFF006666),
                          labelStyle: TextStyle(
                            color: _selectedCategoryFilter == null ? Colors.white : AppColors.navy,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                          onSelected: (_) => setState(() => _selectedCategoryFilter = null),
                        ),
                      ),
                      ...CitizenReportCategory.values.map((cat) {
                        final isSel = _selectedCategoryFilter == cat;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            avatar: Icon(cat.icon, size: 14, color: isSel ? Colors.white : cat.color),
                            label: Text(cat.label.split(' ')[0]),
                            selected: isSel,
                            selectedColor: cat.color,
                            labelStyle: TextStyle(
                              color: isSel ? Colors.white : AppColors.navy,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              setState(() => _selectedCategoryFilter = val ? cat : null);
                            },
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 4. LISTE DES CARTES DE SIGNALEMENTS WAZE
                if (filteredReports.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        const Icon(Icons.verified_user_rounded, size: 56, color: Color(0xFF10B981)),
                        const SizedBox(height: 12),
                        const Text(
                          'Aucun incident signalé',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'La circulation est fluide à ${provider.selectedCity}. Soyez le premier à avertir la communauté !',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF006666),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.add_location_alt_rounded),
                          label: const Text('Créer un signalement (+25 pts)'),
                          onPressed: () => _showWazeReportMenu(context),
                        ),
                      ],
                    ),
                  )
                else
                  ...filteredReports.map((report) {
                    return _buildWazeReportCard(context, provider, report);
                  }),
              ],
            ),
          ),

          // =========================================================
          // TAB 2 : RÉCOMPENSES & BONS D'ACHAT PARTENAIRES
          // =========================================================
          RefreshIndicator(
            onRefresh: () => provider.refreshCitizenData(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
              children: [
                _buildRewardsHeader(profile, provider),
                const SizedBox(height: 16),
                const Text(
                  'Bons d\'achat & Réductions Partenaires',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.navy),
                ),
                const SizedBox(height: 10),
                ...catalog.map((item) {
                  return _buildRewardCatalogCard(context, provider, item);
                }),
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }

  // CARTE DE PROFIL CITOYEN WAZE
  Widget _buildWazeProfileCard(CitizenProfileData? profile, CityFlowProvider provider) {
    final pts = provider.citizenPoints;
    final level = (pts ~/ 100) + 1;
    final progress = (pts % 100) / 100.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Avatar Waze avec couronne
              Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)]),
                ),
                child: const Center(
                  child: Text('👑', style: TextStyle(fontSize: 24)),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          profile?.name ?? 'Conducteur Citoyen',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.navy),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Niveau $level',
                            style: const TextStyle(color: Color(0xFF16A34A), fontSize: 10, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${profile?.badgeTitle ?? "Héros Urbain"} • ${provider.selectedCity}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '$pts',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF006666)),
                  ),
                  const Text('points', style: TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Barre de progression XP
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF006666)),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${(progress * 100).round()}% vers Niveau ${level + 1}', style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
              Text('${100 - (pts % 100)} pts restants', style: const TextStyle(fontSize: 10, color: Color(0xFF006666), fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  // CARTE DE SIGNALEMENT STYLE WAZE
  Widget _buildWazeReportCard(BuildContext context, CityFlowProvider provider, CitizenReport report) {
    final catColor = report.category.color;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: catColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(report.category.icon, color: catColor, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          report.category.label,
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: catColor),
                        ),
                        Text(
                          'Signalé il y a ${_formatTimeAgo(report.createdAt)}',
                          style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: report.severity.color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    report.severity.label,
                    style: TextStyle(color: report.severity.color, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              report.title,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    report.locationDescription,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            // BOUTONS DE CONFIRMATION WAZE (TOUJOURS LÀ / DÉGAGÉ)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF16A34A),
                      side: const BorderSide(color: Color(0xFFDCFCE7), width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    onPressed: () {
                      provider.voteCitizenReport(report.id, 'confirm');
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Merci ! Vous avez confirmé cet incident (+2 pts).'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    icon: const Icon(Icons.thumb_up_rounded, size: 16),
                    label: Text(
                      'Toujours là (${report.upvotes})',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFFEE2E2), width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    onPressed: () {
                      provider.voteCitizenReport(report.id, 'deny');
                    },
                    icon: const Icon(Icons.thumb_down_rounded, size: 16),
                    label: Text(
                      'Dégagé (${report.downvotes})',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // EN-TÊTE DE RÉCOMPENSES
  Widget _buildRewardsHeader(CitizenProfileData? profile, CityFlowProvider provider) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Solde Récompenses', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  Text('${provider.citizenPoints} Points', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 24),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Échangez vos points contre du carburant, des recharges internet et des bons supermarché Dovv / Carrefour.',
            style: TextStyle(color: Colors.white70, fontSize: 11),
          ),
        ],
      ),
    );
  }

  // CARTE DE CATALOGUE DE RÉCOMPENSE
  Widget _buildRewardCatalogCard(BuildContext context, CityFlowProvider provider, CatalogRewardItem item) {
    final canClaim = provider.citizenPoints >= item.pointsCost;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(child: Icon(Icons.local_gas_station_rounded, color: Color(0xFF006666), size: 24)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.navy)),
                Text('${item.partnerName} • ${item.pointsCost} pts', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: canClaim ? const Color(0xFF006666) : const Color(0xFFCBD5E1),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            ),
            onPressed: canClaim
                ? () async {
                    final coupon = await provider.claimReward(item.id);
                    if (coupon != null && context.mounted) {
                      _showRedeemSuccessDialog(context, coupon);
                    }
                  }
                : null,
            child: Text(canClaim ? 'Obtenir' : 'Manque pts', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'à l\'instant';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}j';
  }
}

// ===================================================================
// MODAL GRILLE DE SIGNALEMENT CIRCULAIRE WAZE
// ===================================================================

class _WazeReportGridModal extends StatefulWidget {
  final Function(CitizenReportCategory, CitizenReportSeverity, String, String) onReportSubmitted;

  const _WazeReportGridModal({required this.onReportSubmitted});

  @override
  State<_WazeReportGridModal> createState() => _WazeReportGridModalState();
}

class _WazeReportGridModalState extends State<_WazeReportGridModal> {
  CitizenReportCategory? _selectedCategory;
  final CitizenReportSeverity _selectedSeverity = CitizenReportSeverity.moderate;
  String _selectedSubtypeLabel = '';
  final TextEditingController _commentController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();

  int _autoSendSeconds = 6;
  Timer? _countdownTimer;

  final List<Map<String, dynamic>> _wazeGridItems = [
    {
      'cat': CitizenReportCategory.trafficJam,
      'label': 'Embouteillage',
      'icon': Icons.traffic_rounded,
      'color': const Color(0xFFFF9800),
      'subtypes': ['Ralentissement', 'Gros bouchon', 'Bloqué à l\'arrêt'],
    },
    {
      'cat': CitizenReportCategory.police,
      'label': 'Police',
      'icon': Icons.local_police_rounded,
      'color': const Color(0xFF2196F3),
      'subtypes': ['Contrôle visible', 'Radar / Caché', 'Autre voie'],
    },
    {
      'cat': CitizenReportCategory.accident,
      'label': 'Accident',
      'icon': Icons.car_crash_rounded,
      'color': const Color(0xFFF44336),
      'subtypes': ['Accident léger', 'Grave / Voie bloquée', 'Autre sens'],
    },
    {
      'cat': CitizenReportCategory.hazard,
      'label': 'Danger',
      'icon': Icons.warning_amber_rounded,
      'color': const Color(0xFFFFC107),
      'subtypes': ['Nid-de-poule', 'Véhicule en panne', 'Objet sur la voie'],
    },
    {
      'cat': CitizenReportCategory.roadworks,
      'label': 'Travaux',
      'icon': Icons.construction_rounded,
      'color': const Color(0xFFFF5722),
      'subtypes': ['Voie rétrécie', 'Chantier fermé', 'Travaux de nuit'],
    },
    {
      'cat': CitizenReportCategory.closure,
      'label': 'Route barrée',
      'icon': Icons.block_rounded,
      'color': const Color(0xFFD32F2F),
      'subtypes': ['Inaccessible', 'Déviation obligatoire', 'Manifestation'],
    },
    {
      'cat': CitizenReportCategory.flooding,
      'label': 'Inondation',
      'icon': Icons.water_rounded,
      'color': const Color(0xFF0284C7),
      'subtypes': ['Chaussée inondée', 'Flaque géante', 'Coulée de boue'],
    },
    {
      'cat': CitizenReportCategory.gasStation,
      'label': 'Carburant',
      'icon': Icons.local_gas_station_rounded,
      'color': const Color(0xFF10B981),
      'subtypes': ['Disponible', 'Rupture essence', 'Rupture gasoil'],
    },
    {
      'cat': CitizenReportCategory.other,
      'label': 'Info / Chat',
      'icon': Icons.chat_bubble_rounded,
      'color': const Color(0xFF8B5CF6),
      'subtypes': ['Info générale', 'Présence piétons', 'Feu tricolore en panne'],
    },
  ];

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _commentController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  void _selectCategory(Map<String, dynamic> item) {
    setState(() {
      _selectedCategory = item['cat'] as CitizenReportCategory;
      final subtypes = item['subtypes'] as List<String>;
      _selectedSubtypeLabel = subtypes.first;
      _autoSendSeconds = 6;
    });

    _startCountdown();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_autoSendSeconds > 1) {
        setState(() {
          _autoSendSeconds--;
        });
      } else {
        timer.cancel();
        _submitReport();
      }
    });
  }

  void _submitReport() {
    _countdownTimer?.cancel();
    Navigator.pop(context);

    final title = _selectedSubtypeLabel.isNotEmpty
        ? _selectedSubtypeLabel
        : (_commentController.text.isNotEmpty ? _commentController.text : 'Incident signalé');

    final location = _locationController.text.trim().isNotEmpty
        ? _locationController.text.trim()
        : 'À proximité de votre position actuelle';

    widget.onReportSubmitted(
      _selectedCategory ?? CitizenReportCategory.trafficJam,
      _selectedSeverity,
      title,
      location,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A), // Fond sombre Waze
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: _selectedCategory == null ? _buildWazeGrid() : _buildWazeSubtypeDetails(),
        ),
      ),
    );
  }

  // ÉCRAN 1 : LA GRILLE DES 9 ICÔNES RONDES WAZE
  Widget _buildWazeGrid() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(height: 14),
        const Text(
          'Que voyez-vous ?',
          style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        const Text(
          'Touchez un bouton pour avertir les conducteurs (+25 pts)',
          style: TextStyle(color: Colors.white60, fontSize: 12),
        ),
        const SizedBox(height: 20),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.9,
          ),
          itemCount: _wazeGridItems.length,
          itemBuilder: (ctx, idx) {
            final item = _wazeGridItems[idx];
            final color = item['color'] as Color;
            final label = item['label'] as String;
            final icon = item['icon'] as IconData;

            return GestureDetector(
              onTap: () => _selectCategory(item),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: color.withValues(alpha: 0.5),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(icon, color: Colors.white, size: 30),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    label,
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  // ÉCRAN 2 : SOUS-TYPE & COMPTE À REBOURS AUTOMATIQUE WAZE
  Widget _buildWazeSubtypeDetails() {
    final currentItem = _wazeGridItems.firstWhere((i) => i['cat'] == _selectedCategory);
    final subtypes = currentItem['subtypes'] as List<String>;
    final color = currentItem['color'] as Color;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
              onPressed: () {
                _countdownTimer?.cancel();
                setState(() => _selectedCategory = null);
              },
            ),
            Text(
              currentItem['label'] as String,
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white70),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
        const SizedBox(height: 10),
        const Text(
          'Précisez le type d\'incident :',
          style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        // Boutons de sous-types Waze
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: subtypes.map((sub) {
            final isSel = _selectedSubtypeLabel == sub;
            return GestureDetector(
              onTap: () {
                setState(() => _selectedSubtypeLabel = sub);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isSel ? color : const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isSel ? Colors.white : Colors.white24),
                ),
                child: Text(
                  sub,
                  style: TextStyle(
                    color: isSel ? Colors.white : Colors.white70,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        // Champ commentaire rapide
        TextField(
          controller: _locationController,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Précision sur le lieu (ex: Face station Total)...',
            hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
            prefixIcon: const Icon(Icons.place_rounded, color: Colors.white60, size: 18),
            filled: true,
            fillColor: const Color(0xFF1E293B),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        ),
        const SizedBox(height: 18),
        // Bouton d'envoi Waze avec Compte à rebours
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 4,
          ),
          onPressed: _submitReport,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'ENVOYER ($_autoSendSeconds s)',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 0.5),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.send_rounded, size: 20),
            ],
          ),
        ),
      ],
    );
  }
}
