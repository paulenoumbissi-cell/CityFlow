import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/citizen_report.dart';
import '../models/citizen_reward.dart';
import '../core/constants/app_colors.dart';
import '../widgets/waze_report_modal.dart';

// ─────────────────────────────────────────────────────────────────────────────
//  CITIZEN REPORTS SCREEN  —  CityFlow Premium Redesign
// ─────────────────────────────────────────────────────────────────────────────

class CitizenReportsScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const CitizenReportsScreen({super.key, this.onNavigateTab});

  @override
  State<CitizenReportsScreen> createState() => _CitizenReportsScreenState();
}

class _CitizenReportsScreenState extends State<CitizenReportsScreen>
    with SingleTickerProviderStateMixin {
  CitizenReportCategory? _selectedCategoryFilter;
  String? _selectedCarrefourFilter;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  // ── Palette de marque ──────────────────────────────────────────────────────
  static const Color _navyDark   = Color(0xFF0B1728);
  static const Color _navyMid    = Color(0xFF1A3A6B);
  static const Color _green      = Color(0xFF22A832);
  static const Color _amber      = Color(0xFFF59E0B);
  static const Color _red        = Color(0xFFEF4444);
  static const Color _surface    = Color(0xFFF0F4FA);
  static const Color _cardBg     = Color(0xFFFFFFFF);

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _showWazeReportMenu(BuildContext context) {
    HapticFeedback.mediumImpact();
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
                          ? 'Signalement publié ! Points validés dès confirmation.'
                          : 'Signalement enregistré en local.',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
              backgroundColor: _green,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider  = context.watch<CityFlowProvider>();
    final reports   = provider.currentCityCitizenReports;
    final profile   = provider.citizenProfile;

    final filteredReports = reports.where((r) {
      if (_selectedCategoryFilter != null && r.category != _selectedCategoryFilter) return false;
      if (_selectedCarrefourFilter != null && _selectedCarrefourFilter!.isNotEmpty) {
        final q = _selectedCarrefourFilter!.toLowerCase();
        if (!r.locationDescription.toLowerCase().contains(q) &&
            !r.title.toLowerCase().contains(q)) { return false; }
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
        backgroundColor: _surface,
        // ── FAB ultra-premium ──────────────────────────────────────────────
        floatingActionButton: _buildFab(context),
        floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
        body: RefreshIndicator(
          onRefresh: () => provider.refreshCitizenData(),
          color: _green,
          child: CustomScrollView(
            slivers: [
              // ── SLIVER APP BAR DARK NAVY ─────────────────────────────────
              _buildSliverAppBar(provider, reports),

              // ── BODY CONTENT ─────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Gamification strip
                      _buildGamificationStrip(profile, provider),
                      const SizedBox(height: 16),

                      // Live status banner
                      _buildLiveStatusBanner(reports, provider, context),
                      const SizedBox(height: 20),

                      // ── FILTRES ────────────────────────────────────────
                      _buildSectionLabel('📍 Zones & Carrefours'),
                      const SizedBox(height: 8),
                      _buildCarrefourFilters(provider),
                      const SizedBox(height: 14),

                      _buildSectionLabel('⚡ Type d\'incident'),
                      const SizedBox(height: 8),
                      _buildCategoryFilters(),
                      const SizedBox(height: 20),

                      // ── LISTE ────────────────────────────────────────
                      if (filteredReports.isEmpty)
                        _buildEmptyState(provider)
                      else ...[
                        Row(
                          children: [
                            _buildSectionLabel('${filteredReports.length} incident${filteredReports.length > 1 ? "s" : ""} actif${filteredReports.length > 1 ? "s" : ""}'),
                            const Spacer(),
                            if (_selectedCarrefourFilter != null || _selectedCategoryFilter != null)
                              GestureDetector(
                                onTap: () => setState(() {
                                  _selectedCarrefourFilter = null;
                                  _selectedCategoryFilter = null;
                                }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _red.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'Réinitialiser',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _red),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ...filteredReports.map((r) => _buildReportCard(context, provider, r)),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SLIVER APP BAR
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildSliverAppBar(CityFlowProvider provider, List<CitizenReport> reports) {
    final pts = provider.citizenPoints;
    return SliverAppBar(
      expandedHeight: 130,
      pinned: true,
      elevation: 0,
      backgroundColor: _navyDark,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 18),
        ),
        onPressed: () {
          if (Navigator.canPop(context)) {
            Navigator.pop(context);
          } else {
            widget.onNavigateTab?.call(0);
          }
        },
      ),
      actions: [
        // Points badge
        Container(
          margin: const EdgeInsets.only(right: 6, top: 6, bottom: 6),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF22A832), Color(0xFF15803D)]),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: _green.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 2))],
          ),
          child: Row(
            children: [
              const Icon(Icons.stars_rounded, color: Colors.white, size: 15),
              const SizedBox(width: 4),
              Text(
                '$pts pts',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.refresh_rounded, color: Colors.white70, size: 20),
          onPressed: () => Provider.of<CityFlowProvider>(context, listen: false).refreshCitizenData(),
          tooltip: 'Actualiser',
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [_navyDark, _navyMid],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Stack(
            children: [
              // Decorative circles
              Positioned(right: -30, top: -20, child: _glowCircle(120, Colors.white, 0.04)),
              Positioned(left: -20, bottom: 0, child: _glowCircle(80, _green, 0.08)),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 40, 16, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                            ),
                            child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 18),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Signalements Citoyens',
                                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
                              ),
                              Text(
                                '${provider.selectedCity}  •  ${reports.length} alerte${reports.length != 1 ? "s" : ""} active${reports.length != 1 ? "s" : ""}',
                                style: const TextStyle(fontSize: 11, color: Colors.white60, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        collapseMode: CollapseMode.pin,
        titlePadding: const EdgeInsets.only(left: 56, bottom: 12),
        title: const Text(
          'Signalements',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
        ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  GAMIFICATION STRIP
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildGamificationStrip(CitizenProfileData? profile, CityFlowProvider provider) {
    final pts     = provider.citizenPoints;
    final level   = (pts ~/ 100) + 1;
    final progress = (pts % 100) / 100.0;

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [_navyDark, _navyMid],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: _navyDark.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          // Avatar circle
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(colors: [_green, Color(0xFF15803D)]),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 2),
            ),
            child: const Center(child: Text('👑', style: TextStyle(fontSize: 20))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      profile?.name ?? 'Conducteur Citoyen',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Colors.white),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: _green.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: _green.withValues(alpha: 0.5)),
                      ),
                      child: Text(
                        'Niv. $level',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  profile?.badgeTitle ?? 'Guide de la Cité',
                  style: const TextStyle(fontSize: 10, color: Colors.white54, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 5,
                    backgroundColor: Colors.white.withValues(alpha: 0.12),
                    valueColor: const AlwaysStoppedAnimation<Color>(_green),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${100 - (pts % 100)} pts vers Niveau ${level + 1}',
                  style: const TextStyle(fontSize: 10, color: Colors.white38),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$pts',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 26, color: Colors.white, height: 1),
              ),
              const Text('points', style: TextStyle(fontSize: 9, color: Colors.white38, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  LIVE STATUS BANNER
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildLiveStatusBanner(List<CitizenReport> reports, CityFlowProvider provider, BuildContext context) {
    final hasAlerts = reports.isNotEmpty;
    final alertCount = reports.length;
    final bannerColor = hasAlerts ? _amber : _green;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: bannerColor.withValues(alpha: 0.25), width: 1.5),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 3))],
      ),
      child: Row(
        children: [
          // Animated dot + icon
          ScaleTransition(
            scale: _pulseAnim,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: bannerColor.withValues(alpha: 0.12),
                border: Border.all(color: bannerColor.withValues(alpha: 0.35)),
              ),
              child: Icon(
                hasAlerts ? Icons.warning_amber_rounded : Icons.check_circle_rounded,
                color: bannerColor,
                size: 22,
              ),
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
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: bannerColor),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      hasAlerts ? '$alertCount INCIDENT${alertCount > 1 ? "S" : ""} EN COURS' : 'RÉSEAU FLUIDE',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: bannerColor, letterSpacing: 0.5),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  hasAlerts
                      ? '$alertCount perturbation${alertCount > 1 ? "s" : ""} sur vos axes à ${provider.selectedCity}'
                      : 'Circulation fluide sur tout le réseau',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              if (Navigator.canPop(context)) { Navigator.pop(context); }
              else { widget.onNavigateTab?.call(0); }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: _navyDark,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Column(
                children: [
                  Icon(Icons.map_rounded, size: 16, color: Color(0xFF34D399)),
                  SizedBox(height: 2),
                  Text('Carte', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  CARREFOUR FILTERS
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildCarrefourFilters(CityFlowProvider provider) {
    final carrefours = provider.selectedCity.toLowerCase().contains('yaound')
        ? ['CRADAT', 'Nlongkak', 'Mokolo', 'Poste Centrale', 'Bastos', 'Nsam', 'Mvan', 'Emombo']
        : ['Ndokoti', 'Deido', 'Akwa', 'Bonanjo', 'Ange Raphaël', 'Bépanda', 'Bonabéri'];

    return SizedBox(
      height: 34,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _filterPill(
            label: 'Tous',
            icon: Icons.location_city_rounded,
            selected: _selectedCarrefourFilter == null,
            selectedColor: _navyDark,
            onTap: () => setState(() => _selectedCarrefourFilter = null),
          ),
          ...carrefours.map((c) => _filterPill(
            label: c,
            icon: Icons.place_rounded,
            selected: _selectedCarrefourFilter == c,
            selectedColor: _navyMid,
            onTap: () => setState(() => _selectedCarrefourFilter = _selectedCarrefourFilter == c ? null : c),
          )),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  CATEGORY FILTERS
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildCategoryFilters() {
    return SizedBox(
      height: 34,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _filterPill(
            label: 'Tout voir',
            icon: Icons.apps_rounded,
            selected: _selectedCategoryFilter == null,
            selectedColor: _navyDark,
            onTap: () => setState(() => _selectedCategoryFilter = null),
          ),
          ...CitizenReportCategory.values.map((cat) => _filterPill(
            label: cat.label,
            icon: cat.icon,
            selected: _selectedCategoryFilter == cat,
            selectedColor: cat.color,
            onTap: () => setState(() => _selectedCategoryFilter = _selectedCategoryFilter == cat ? null : cat),
          )),
        ],
      ),
    );
  }

  Widget _filterPill({
    required String label,
    required IconData icon,
    required bool selected,
    required Color selectedColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 7),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
        decoration: BoxDecoration(
          color: selected ? selectedColor : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? selectedColor : const Color(0xFFDDE3EE),
            width: selected ? 0 : 1.2,
          ),
          boxShadow: selected ? [BoxShadow(color: selectedColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))] : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: selected ? Colors.white : const Color(0xFF64748B)),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : const Color(0xFF334155),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  REPORT CARD — PREMIUM DARK-GLASS
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildReportCard(BuildContext context, CityFlowProvider provider, CitizenReport report) {
    final catColor = report.category.color;
    final sevColor = report.severity.color;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE8EDF5)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 14, offset: const Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Colored top accent bar ───────────────────────────────────
            Container(
              height: 3,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [catColor, catColor.withValues(alpha: 0.3)]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header row ────────────────────────────────────────
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: catColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: catColor.withValues(alpha: 0.25)),
                        ),
                        child: Icon(report.category.icon, color: catColor, size: 22),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  report.category.label,
                                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: catColor),
                                ),
                                if (report.isVerified) ...[
                                  const SizedBox(width: 5),
                                  const Icon(Icons.verified_rounded, size: 13, color: Color(0xFF3B82F6)),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Signalé il y a ${_formatTimeAgo(report.createdAt)}  ·  ${report.upvotes + report.downvotes} avis',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                            ),
                          ],
                        ),
                      ),
                      // Severity badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: sevColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: sevColor.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(width: 5, height: 5, decoration: BoxDecoration(shape: BoxShape.circle, color: sevColor)),
                            const SizedBox(width: 4),
                            Text(
                              report.severity.label,
                              style: TextStyle(color: sevColor, fontSize: 10, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // ── Title ─────────────────────────────────────────────
                  Text(
                    report.title,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.navy),
                  ),
                  const SizedBox(height: 6),

                  // ── Location ──────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.location_on_rounded, size: 13, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            report.locationDescription,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Confirmation bar ──────────────────────────────────
                  _buildConfirmationBar(context, provider, report),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfirmationBar(BuildContext context, CityFlowProvider provider, CitizenReport report) {
    final total = (report.upvotes + report.downvotes).clamp(1, 9999);
    final confirmRatio = report.upvotes / total;

    return Column(
      children: [
        // Thin progress bar showing up/down ratio
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: SizedBox(
            height: 3,
            child: Row(
              children: [
                Flexible(
                  flex: (confirmRatio * 100).round().clamp(0, 100),
                  child: Container(color: const Color(0xFF22C55E)),
                ),
                Flexible(
                  flex: 100 - (confirmRatio * 100).round().clamp(0, 100),
                  child: Container(color: const Color(0xFFEF4444)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            // TOUJOURS LÀ button
            Expanded(
              child: _voteButton(
                label: 'Toujours là',
                count: report.upvotes,
                icon: Icons.thumb_up_rounded,
                color: const Color(0xFF22C55E),
                bgColor: const Color(0xFFF0FDF4),
                borderColor: const Color(0xFFD1FAE5),
                onPressed: () {
                  HapticFeedback.lightImpact();
                  provider.voteCitizenReport(report.id, 'confirm');
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Incident confirmé  •  +5 pts'),
                      backgroundColor: const Color(0xFF16A34A),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 8),
            // VOIE DÉGAGÉE button
            Expanded(
              child: _voteButton(
                label: 'Voie libre',
                count: report.downvotes,
                icon: Icons.thumb_down_rounded,
                color: const Color(0xFFEF4444),
                bgColor: const Color(0xFFFFF1F2),
                borderColor: const Color(0xFFFEE2E2),
                onPressed: () {
                  HapticFeedback.lightImpact();
                  provider.voteCitizenReport(report.id, 'deny');
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _voteButton({
    required String label,
    required int count,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required Color borderColor,
    required VoidCallback onPressed,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 10),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              '$label ($count)',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: color),
            ),
          ],
        ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  EMPTY STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildEmptyState(CityFlowProvider provider) {
    final hasFilter = _selectedCarrefourFilter != null || _selectedCategoryFilter != null;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: _cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE8EDF5)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: (hasFilter ? _amber : _green).withValues(alpha: 0.1),
            ),
            child: Icon(
              hasFilter ? Icons.filter_alt_off_rounded : Icons.verified_user_rounded,
              size: 44,
              color: hasFilter ? _amber : _green,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            hasFilter ? 'Aucun incident pour ce filtre' : 'Tout roule à ${provider.selectedCity} 🎉',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.navy),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            hasFilter
                ? 'Aucun incident ne correspond à votre sélection.'
                : 'Circulation fluide sur tous les carrefours. La communauté surveille en continu.',
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: () {
              if (hasFilter) {
                setState(() {
                  _selectedCarrefourFilter = null;
                  _selectedCategoryFilter = null;
                });
              } else {
                if (Navigator.canPop(context)) { Navigator.pop(context); }
                else { widget.onNavigateTab?.call(0); }
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [_navyDark, _navyMid]),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [BoxShadow(color: _navyDark.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(hasFilter ? Icons.refresh_rounded : Icons.map_rounded, size: 16, color: Colors.white),
                  const SizedBox(width: 8),
                  Text(
                    hasFilter ? 'Réinitialiser les filtres' : 'Explorer la carte GPS',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  FAB
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildFab(BuildContext context) {
    return GestureDetector(
      onTap: () => _showWazeReportMenu(context),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 40),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [_navyDark, _navyMid, _green],
            stops: [0.0, 0.5, 1.0],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: _navyDark.withValues(alpha: 0.35), blurRadius: 18, offset: const Offset(0, 6)),
            BoxShadow(color: _green.withValues(alpha: 0.25), blurRadius: 18, offset: const Offset(4, 6)),
          ],
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_location_alt_rounded, color: Colors.white, size: 22),
            SizedBox(width: 10),
            Text(
              'SIGNALER  +25 PTS',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 14,
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  HELPERS
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildSectionLabel(String label) {
    return Text(
      label,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF475569), letterSpacing: 0.3),
    );
  }

  Widget _glowCircle(double size, Color color, double opacity) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: opacity),
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
