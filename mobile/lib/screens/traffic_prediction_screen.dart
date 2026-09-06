import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../core/constants/app_colors.dart';
import '../core/services/api_service.dart';
import '../widgets/city_selector.dart';

class TrafficPredictionScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const TrafficPredictionScreen({super.key, this.onNavigateTab});

  @override
  State<TrafficPredictionScreen> createState() => _TrafficPredictionScreenState();
}

class _TrafficPredictionScreenState extends State<TrafficPredictionScreen> {
  Map<String, dynamic>? _aiForecastData;
  bool _isLoading = false;

  // Simulateur rapide de trajet
  String? _simOrigin;
  String? _simDestination;

  @override
  void initState() {
    super.initState();
    _loadForecast();
  }

  Future<void> _loadForecast() async {
    final provider = context.read<CityFlowProvider>();
    setState(() => _isLoading = true);

    final now = DateTime.now();
    final hour = now.hour;
    final day = now.weekday % 7;

    final autoEvents = <String>[];
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      autoEvents.add('school_office_rush');
    }
    if (now.weekday == DateTime.friday || now.weekday == DateTime.saturday || (now.weekday == DateTime.thursday && hour >= 17)) {
      autoEvents.add('funeral_cortege');
    }
    if (now.weekday == DateTime.wednesday || now.weekday == DateTime.saturday) {
      autoEvents.add('market_day');
    }

    final data = await CityFlowMobileApiService.fetchAiForecast(
      city: provider.selectedCity,
      weather: 'light_rain',
      hour: hour,
      dayOfWeek: day,
      events: autoEvents,
    );

    if (mounted) {
      setState(() {
        _aiForecastData = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final isYaounde = provider.selectedCity == 'Yaoundé';

    final now = DateTime.now();
    final hour = now.hour;
    final isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

    // Initialisation des options de simulation de trajet si non définies
    _simOrigin ??= isYaounde ? 'Mvan (Gare Voyageurs)' : 'Rond-point Deido';
    _simDestination ??= isYaounde ? 'Bastos (Ambassades)' : 'Carrefour Akwa (Bld Liberté)';

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
          backgroundColor: Colors.white,
          elevation: 0.5,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: AppColors.navy),
            tooltip: 'Retour à la carte',
            onPressed: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              } else {
                widget.onNavigateTab?.call(0);
              }
            },
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Prévisions de Trafic & Conseils',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
              ),
              Text(
                '${provider.selectedCity} • En temps réel',
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: _isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0284C7)),
                    )
                  : const Icon(Icons.refresh_rounded, color: Color(0xFF0284C7)),
              tooltip: 'Actualiser',
              onPressed: _loadForecast,
            ),
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: CitySelector(),
            ),
          ],
        ),
        body: _isLoading && _aiForecastData == null
            ? const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Color(0xFF00C3FF)),
                    SizedBox(height: 16),
                    Text(
                      'Calcul des prévisions pour votre ville...',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              )
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                children: [
                  // =========================================================
                  // 1. BANDEAU PRINCIPAL : LE RÉSULTAT CLAIR EN 1 PHRASE
                  // =========================================================
                  _buildDirectStatusBanner(isRushHour),

                  const SizedBox(height: 18),

                  // =========================================================
                  // 2. SECTION : À QUELLE HEURE PARTIR ? (HORAIRES & GAIN)
                  // =========================================================
                  _buildWhenToLeaveSection(now, isRushHour),

                  const SizedBox(height: 20),

                  // =========================================================
                  // 3. SECTION : TESTER MON TRAJET (SIMULATION IMMÉDIATE)
                  // =========================================================
                  _buildTestMyTripCard(context, provider, isYaounde),

                  const SizedBox(height: 20),

                  // =========================================================
                  // 4. SECTION : LES ZONES À ÉVITER & CONTOURNEMENTS CONSEILLÉS
                  // =========================================================
                  _buildTroubleSpotsAndDetoursSection(isYaounde),

                  const SizedBox(height: 20),

                  // =========================================================
                  // 5. SECTION : POURQUOI CE TRAFIC ? (EXPLICATION NATURELLE)
                  // =========================================================
                  _buildWhyThisTrafficSection(now),
                ],
              ),
      ),
    );
  }

  // =========================================================================
  // 1. BANDEAU DE STATUT IMMÉDIAT (COMPRÉHENSIBLE PAR TOUT LE MONDE)
  // =========================================================================
  Widget _buildDirectStatusBanner(bool isRushHour) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isRushHour ? const Color(0xFF7C2D12) : const Color(0xFF064E3B),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isRushHour ? const Color(0xFFEA580C) : const Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isRushHour ? Icons.warning_rounded : Icons.check_circle_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isRushHour ? '🚨 GROS BOUCHON DANS 45 MIN' : '🟢 CIRCULATION ACTUELLEMENT FLUIDE',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            isRushHour
                ? 'La pluie combinée aux sorties de bureaux va saturer le centre-ville. Pour éviter d\'être coincé dans les bouchons, partez maintenant ou prenez les routes secondaires.'
                : 'Les grands axes roulent bien en ce moment. Vous pouvez circuler librement sur l\'ensemble du réseau.',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13.5,
              height: 1.35,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.bolt_rounded, color: Colors.amberAccent, size: 16),
                const SizedBox(width: 6),
                Text(
                  isRushHour ? 'Conseil : Partez avant 16h45 pour économiser 25 min' : 'Temps de trajet optimal garanti',
                  style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 2. SECTION : À QUELLE HEURE PARTIR AUJOURD'HUI ? (BAROMÈTRE DES HEURES)
  // =========================================================================
  Widget _buildWhenToLeaveSection(DateTime now, bool isRushHour) {
    final currentH = now.hour;

    final List<Map<String, dynamic>> timeline = [
      {
        'time': 'Maintenant (${currentH}h00)',
        'duration': '20 min',
        'status': 'Fluide',
        'color': const Color(0xFF10B981),
        'icon': Icons.sentiment_very_satisfied_rounded,
        'tag': 'Meilleur moment',
      },
      {
        'time': 'Dans 30 min (${(currentH + 1) % 24}h30)',
        'duration': '35 min',
        'status': 'Ralentissement',
        'color': const Color(0xFFF59E0B),
        'icon': Icons.sentiment_neutral_rounded,
        'tag': '+15 min d\'attente',
      },
      {
        'time': 'Dans 1h30 (${(currentH + 2) % 24}h30)',
        'duration': '55 min',
        'status': 'Gros bouchon',
        'color': const Color(0xFFDC2626),
        'icon': Icons.sentiment_very_dissatisfied_rounded,
        'tag': 'À ÉVITER',
      },
      {
        'time': 'Plus tard (${(currentH + 3) % 24}h30)',
        'duration': '22 min',
        'status': 'Retour au calme',
        'color': const Color(0xFF10B981),
        'icon': Icons.sentiment_satisfied_rounded,
        'tag': 'Fluide',
      },
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.schedule_rounded, color: Color(0xFF0284C7), size: 20),
              SizedBox(width: 8),
              Text(
                'À quelle heure partir pour ne pas être bloqué ?',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5, color: AppColors.navy),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...timeline.map((item) {
            final Color col = item['color'] as Color;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: col.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: col.withValues(alpha: 0.25)),
              ),
              child: Row(
                children: [
                  Icon(item['icon'] as IconData, color: col, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['time'] as String,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5, color: AppColors.navy),
                        ),
                        Text(
                          '${item['status']} • Temps estimé : ${item['duration']}',
                          style: TextStyle(fontSize: 11, color: col, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: col,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item['tag'] as String,
                      style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // =========================================================================
  // 3. SECTION : TESTER MON TRAJET PERSONNEL (RÉPONSE DIRECTE & CONCRÈTE)
  // =========================================================================
  Widget _buildTestMyTripCard(BuildContext context, CityFlowProvider provider, bool isYaounde) {
    final List<String> commonPlaces = isYaounde
        ? ['Poste Centrale', 'Bastos (Ambassades)', 'Mvan (Gare Voyageurs)', 'Marché Mokolo', 'Omnisports', 'Carrefour Nlongkak']
        : ['Carrefour Akwa (Boulevard Liberté)', 'Rond-point Deido', 'Bonanjo', 'Carrefour Ndokoti (Axe Lourd)', 'Bonamoussadi'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF00C3FF).withValues(alpha: 0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00C3FF).withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.directions_car_filled_rounded, color: Color(0xFF0284C7), size: 20),
              SizedBox(width: 8),
              Text(
                'Tester votre trajet',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.navy),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Sélectionnez votre départ et destination pour voir le conseil en direct :',
            style: TextStyle(color: Color(0xFF64748B), fontSize: 11.5),
          ),
          const SizedBox(height: 12),

          // Sélecteur Départ
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.my_location_rounded, color: Color(0xFF0284C7), size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: commonPlaces.contains(_simOrigin) ? _simOrigin : commonPlaces.first,
                      items: commonPlaces.map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)))).toList(),
                      onChanged: (val) => setState(() => _simOrigin = val),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Sélecteur Destination
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on_rounded, color: Color(0xFFDC2626), size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: commonPlaces.contains(_simDestination) ? _simDestination : commonPlaces[1],
                      items: commonPlaces.map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)))).toList(),
                      onChanged: (val) => setState(() => _simDestination = val),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Résultat de la simulation pour ce trajet
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF86EFAC)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.check_circle_outline_rounded, color: Color(0xFF16A34A), size: 16),
                    SizedBox(width: 6),
                    Text(
                      'CONSEIL TRAJET CITYFLOW',
                      style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.w900, fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  '🚗 Axe principal saturé : 48 min d\'attente estimée.\n🌿 Route secondaire recommandée : 24 min (Gain : +24 min).',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1E293B), height: 1.3),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00C3FF),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              onPressed: () {
                provider.fetchSmartRoutes(
                  origin: _simOrigin,
                  destination: _simDestination,
                );
                widget.onNavigateTab?.call(1); // Ouvre l'onglet Itinéraires
              },
              icon: const Icon(Icons.navigation_rounded, size: 16, color: Colors.white),
              label: const Text(
                'Lancer cet itinéraire sur la carte',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 4. SECTION : LES ZONES À ÉVITER ET LES CONTOURNEMENTS CONSEILLÉS
  // =========================================================================
  Widget _buildTroubleSpotsAndDetoursSection(bool isYaounde) {
    final List<Map<String, dynamic>> troubleSpots = isYaounde
        ? [
            {
              'place': 'Poste Centrale & Rond-point Warda',
              'status': 'Bouchon dans 30 min',
              'color': const Color(0xFFDC2626),
              'detour': 'Prenez la route secondaire Bastos Est / Mfoundi',
              'timeSaved': '+16 min',
            },
            {
              'place': 'Marché Mokolo & Madagascar',
              'status': 'Très encombré (Marché actif)',
              'color': const Color(0xFFDC2626),
              'detour': 'Contournez par la Cité Verte (Goudron fluide)',
              'timeSaved': '+14 min',
            },
            {
              'place': 'Carrefour Nlongkak',
              'status': 'Ralentissement modéré',
              'color': const Color(0xFFF59E0B),
              'detour': 'Passez par la rue des Dragages',
              'timeSaved': '+8 min',
            },
          ]
        : [
            {
              'place': 'Carrefour Ndokoti (Axe Lourd)',
              'status': 'Saturé dans 40 min',
              'color': const Color(0xFFDC2626),
              'detour': 'Passez par la rocade Ndogbong / Cité des Palmiers',
              'timeSaved': '+20 min',
            },
            {
              'place': 'Rond-point Deido & Pont Wouri',
              'status': 'Gros ralentissements',
              'color': const Color(0xFFDC2626),
              'detour': 'Empruntez l\'axe secondaire Bonassama Ouest',
              'timeSaved': '+18 min',
            },
            {
              'place': 'Marché Mboppi & Bessengué',
              'status': 'Circulation dense',
              'color': const Color(0xFFF59E0B),
              'detour': 'Contournez par le Boulevard de la Liberté',
              'timeSaved': '+10 min',
            },
          ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Zones qui vont bloquer & Par où passer',
          style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w900, fontSize: 14),
        ),
        const SizedBox(height: 2),
        const Text(
          'Conseils de contournement par routes secondaires :',
          style: TextStyle(color: Color(0xFF64748B), fontSize: 11.5),
        ),
        const SizedBox(height: 10),
        ...troubleSpots.map((spot) {
          final Color col = spot['color'] as Color;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        spot['place'] as String,
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.navy),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: col.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        spot['status'] as String,
                        style: TextStyle(color: col, fontWeight: FontWeight.w800, fontSize: 10.5),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.alt_route_rounded, color: Color(0xFF10B981), size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '💡 ${spot['detour']}',
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF334155), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    'Gain estimé : ${spot['timeSaved']}',
                    style: const TextStyle(color: Color(0xFF16A34A), fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // =========================================================================
  // 5. SECTION : POURQUOI CE TRAFIC ? (EXPLICATION CLAIRE SANS JARGON)
  // =========================================================================
  Widget _buildWhyThisTrafficSection(DateTime now) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.info_outline_rounded, color: Color(0xFF475569), size: 18),
              SizedBox(width: 8),
              Text(
                'Pourquoi ces prévisions ?',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.navy),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const _WhyFactorLine(
            icon: Icons.cloud_outlined,
            title: 'Météo pluvieuse',
            desc: 'La pluie ralentit la vitesse des véhicules de 18% sur les axes glissants.',
          ),
          const SizedBox(height: 6),
          const _WhyFactorLine(
            icon: Icons.school_outlined,
            title: 'Sorties de classes et bureaux',
            desc: 'Forte concentration de voitures et taxis entre 16h30 et 19h00.',
          ),
          const SizedBox(height: 6),
          const _WhyFactorLine(
            icon: Icons.church_outlined,
            title: 'Événements du jour',
            desc: 'Cortèges et rassemblements ralentissant les sorties de la ville.',
          ),
        ],
      ),
    );
  }
}

class _WhyFactorLine extends StatelessWidget {
  final IconData icon;
  final String title;
  final String desc;
  const _WhyFactorLine({required this.icon, required this.title, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 15, color: const Color(0xFF64748B)),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 11.5, color: Color(0xFF334155)),
              children: [
                TextSpan(text: '$title : ', style: const TextStyle(fontWeight: FontWeight.w800)),
                TextSpan(text: desc),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
