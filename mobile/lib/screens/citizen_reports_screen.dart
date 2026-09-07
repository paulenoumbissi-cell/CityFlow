import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/citizen_report.dart';
import '../models/citizen_reward.dart';
import '../core/constants/app_colors.dart';
import '../widgets/waze_report_modal.dart';

class CitizenReportsScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const CitizenReportsScreen({super.key, this.onNavigateTab});

  @override
  State<CitizenReportsScreen> createState() => _CitizenReportsScreenState();
}

class _CitizenReportsScreenState extends State<CitizenReportsScreen> {
  CitizenReportCategory? _selectedCategoryFilter;
  String? _selectedCarrefourFilter;

  // ===================================================================
  // MODAL DE SIGNALEMENT WAZE ULTRA-MODERNE (12 CATÉGORIES CAMEROUNAISES)
  // ===================================================================
  void _showWazeReportMenu(BuildContext context) {
    final provider = context.read<CityFlowProvider>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WazeReportGridModal(
        selectedCity: provider.selectedCity,
        onReportSubmitted: (category, severity, title, location) async {
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
                  Expanded(
                    child: Text(
                      ok
                          ? 'Signalement publié ! Les points seront validés dès confirmation citoyenne.'
                          : 'Signalement enregistré en local.',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFF006666),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final reports = provider.currentCityCitizenReports;
    final profile = provider.citizenProfile;

    // Filter reports by category and carrefour
    final filteredReports = reports.where((r) {
      if (_selectedCategoryFilter != null && r.category != _selectedCategoryFilter) {
        return false;
      }
      if (_selectedCarrefourFilter != null && _selectedCarrefourFilter!.isNotEmpty) {
        final matches = r.locationDescription.toLowerCase().contains(_selectedCarrefourFilter!.toLowerCase()) ||
            r.title.toLowerCase().contains(_selectedCarrefourFilter!.toLowerCase());
        if (!matches) return false;
      }
      return true;
    }).toList();

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
          elevation: 0,
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
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF006666).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.campaign_rounded, color: Color(0xFF006666), size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Signalements & Entraide',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.navy),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${provider.selectedCity} • ${reports.length} ${reports.length > 1 ? "alertes actives" : "alerte active"}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF006666).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF006666).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.stars_rounded, color: Color(0xFF006666), size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '${provider.citizenPoints} pts',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF006666)),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: () => provider.refreshCitizenData(),
              tooltip: 'Actualiser',
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          heroTag: 'fab_waze_report',
          backgroundColor: const Color(0xFF006666),
          foregroundColor: Colors.white,
          elevation: 6,
          icon: const Icon(Icons.add_location_alt_rounded, size: 20),
          label: const Text(
            'SIGNALER (+25 PTS)',
            style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5, fontSize: 12),
          ),
          onPressed: () => _showWazeReportMenu(context),
        ),
        body: RefreshIndicator(
          onRefresh: () => provider.refreshCitizenData(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
            children: [
              // 1. CARTE PROFIL CITOYEN / HUMEUR WAZE
              _buildWazeProfileCard(profile, provider),
              const SizedBox(height: 14),

              // 2. BANNIÈRE ÉTAT DU RÉSEAU & INFO TRAFIC EN DIRECT
              _buildTrafficOverviewBanner(context, reports, provider),
              const SizedBox(height: 14),

              // 3. FILTRE RAPIDE PAR CARREFOURS EMBLÉMATIQUES
              const Text(
                'Carrefours clés :',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: const Text('Tous carrefours'),
                        selected: _selectedCarrefourFilter == null,
                        selectedColor: const Color(0xFF006666),
                        labelStyle: TextStyle(
                          color: _selectedCarrefourFilter == null ? Colors.white : AppColors.navy,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                        onSelected: (_) => setState(() => _selectedCarrefourFilter = null),
                      ),
                    ),
                    ...(provider.selectedCity.toLowerCase().contains('yaound')
                            ? ['CRADAT', 'Nlongkak', 'Mokolo', 'Poste Centrale', 'Bastos', 'Nsam', 'Mvan', 'Emombo']
                            : ['Ndokoti', 'Deido', 'Akwa', 'Bonanjo', 'Ange Raphaël', 'Bépanda', 'Bonabéri'])
                        .map((carrefour) {
                      final isSel = _selectedCarrefourFilter == carrefour;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          avatar: const Icon(Icons.place_rounded, size: 14),
                          label: Text(carrefour),
                          selected: isSel,
                          selectedColor: const Color(0xFF006666),
                          labelStyle: TextStyle(
                            color: isSel ? Colors.white : AppColors.navy,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                          onSelected: (val) {
                            setState(() => _selectedCarrefourFilter = val ? carrefour : null);
                          },
                        ),
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              // 4. FILTRES DE CATÉGORIES DÉROULANTS (Spécialités Cameroun)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: const Text('Toutes alertes'),
                        selected: _selectedCategoryFilter == null,
                        selectedColor: const Color(0xFF006666),
                        labelStyle: TextStyle(
                          color: _selectedCategoryFilter == null ? Colors.white : AppColors.navy,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
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
                          label: Text(cat.label),
                          selected: isSel,
                          selectedColor: cat.color,
                          labelStyle: TextStyle(
                            color: isSel ? Colors.white : AppColors.navy,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
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

              // 5. LISTE DES CARTES DE SIGNALEMENTS WAZE
              if (filteredReports.isEmpty)
                Container(
                  padding: const EdgeInsets.all(28),
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  alignment: Alignment.center,
                  child: Column(
                    children: [
                      Icon(
                        (_selectedCarrefourFilter != null || _selectedCategoryFilter != null)
                            ? Icons.filter_alt_off_rounded
                            : Icons.verified_user_rounded,
                        size: 48,
                        color: (_selectedCarrefourFilter != null || _selectedCategoryFilter != null)
                            ? AppColors.textSecondary
                            : const Color(0xFF10B981),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        (_selectedCarrefourFilter != null || _selectedCategoryFilter != null)
                            ? 'Aucun incident pour ce filtre'
                            : 'Circulation fluide sur tout le réseau',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        (_selectedCarrefourFilter != null || _selectedCategoryFilter != null)
                            ? 'Aucun incident ne correspond à votre sélection à ${provider.selectedCity}.'
                            : 'Tout roule normalement à ${provider.selectedCity}. Aucun ralentissement actif.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 16),
                      if (_selectedCarrefourFilter != null || _selectedCategoryFilter != null)
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF006666),
                            side: const BorderSide(color: Color(0xFF006666)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          ),
                          icon: const Icon(Icons.refresh_rounded, size: 16),
                          label: const Text(
                            'Réinitialiser les filtres',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                          onPressed: () {
                            setState(() {
                              _selectedCarrefourFilter = null;
                              _selectedCategoryFilter = null;
                            });
                          },
                        )
                      else
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF006666),
                            side: const BorderSide(color: Color(0xFF006666)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          ),
                          icon: const Icon(Icons.explore_rounded, size: 16),
                          label: const Text(
                            'Explorer la carte interactive',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                          onPressed: () {
                            if (Navigator.canPop(context)) {
                              Navigator.pop(context);
                            } else {
                              widget.onNavigateTab?.call(0);
                            }
                          },
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
      ),
    );
  }

  // ===================================================================
  // WIDGETS D'AFFICHAGE ET CARTES
  // ===================================================================

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
              Container(
                width: 50,
                height: 50,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(colors: [Color(0xFF006666), Color(0xFF008080)]),
                ),
                child: const Center(
                  child: Text('👑', style: TextStyle(fontSize: 22)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            profile?.name ?? 'Conducteur Citoyen',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.navy),
                            overflow: TextOverflow.ellipsis,
                          ),
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
                      '${profile?.badgeTitle ?? "Guide de la Cité"} • ${provider.selectedCity}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '$pts',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF006666)),
                  ),
                  const Text('points', style: TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
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

  // BANNIÈRE ÉTAT DU RÉSEAU & INFO TRAFIC EN DIRECT
  Widget _buildTrafficOverviewBanner(BuildContext context, List<CitizenReport> reports, CityFlowProvider provider) {
    final hasAlerts = reports.isNotEmpty;
    final city = provider.selectedCity;
    final alertCount = reports.length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: hasAlerts
              ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
              : [const Color(0xFF064E3B), const Color(0xFF042F2E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: hasAlerts
              ? const Color(0xFFF59E0B).withValues(alpha: 0.3)
              : const Color(0xFF10B981).withValues(alpha: 0.3),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: hasAlerts
                      ? const Color(0xFFF59E0B).withValues(alpha: 0.2)
                      : const Color(0xFF10B981).withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  hasAlerts ? Icons.warning_amber_rounded : Icons.check_circle_rounded,
                  color: hasAlerts ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: hasAlerts
                                ? const Color(0xFFF59E0B).withValues(alpha: 0.25)
                                : const Color(0xFF10B981).withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: hasAlerts ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                hasAlerts ? '$alertCount ${alertCount > 1 ? "INCIDENTS ACTIFS" : "INCIDENT ACTIF"}' : 'RÉSEAU FLUIDE',
                                style: TextStyle(
                                  color: hasAlerts ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                                  fontWeight: FontWeight.w900,
                                  fontSize: 10,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(
                          city,
                          style: const TextStyle(color: Colors.white60, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hasAlerts
                          ? '$alertCount ${alertCount > 1 ? "perturbations signalées" : "perturbation signalée"} sur vos axes'
                          : 'Trafic dégagé sur les carrefours clés',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            height: 1,
            color: Colors.white.withValues(alpha: 0.1),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  hasAlerts
                      ? 'Consultez la carte en temps réel :'
                      : 'Surveillance continue par la communauté',
                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.18),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.map_rounded, size: 14, color: Color(0xFF34D399)),
                label: const Text('Carte GPS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                onPressed: () {
                  if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  } else {
                    widget.onNavigateTab?.call(0);
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  // CARTE DE SIGNALEMENT WAZE CAMEROUN
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
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: catColor),
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
                          content: Text('Merci ! Vous avez confirmé cet incident (+5 pts).'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    icon: const Icon(Icons.thumb_up_rounded, size: 15),
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
                    icon: const Icon(Icons.thumb_down_rounded, size: 15),
                    label: Text(
                      'Voie Dégagée (${report.downvotes})',
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

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'à l\'instant';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}j';
  }
}


