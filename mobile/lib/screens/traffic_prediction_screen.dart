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
  Map<String, dynamic>? _liveWeatherData;
  Map<String, dynamic>? _tripPredictionResult;

  bool _isLoading = false;
  bool _isPredictingTrip = false;

  // Simulateur prédictif de trajet futur (ex: Aller au CRADAT à 17h)
  String _selectedTripOrigin = 'Poste Centrale';
  String _selectedTripDestination = 'Carrefour CRADAT';
  double _selectedTripHour = 17.0;

  String? _lastCity;

  @override
  void initState() {
    super.initState();
    _loadAllAiData();
  }

  Future<void> _loadAllAiData() async {
    final provider = context.read<CityFlowProvider>();
    setState(() => _isLoading = true);

    final now = DateTime.now();
    final hour = now.hour;
    final day = now.weekday % 7;

    final autoEvents = <String>[];
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      autoEvents.add('school_office_rush');
      autoEvents.add('university_cradat_rush');
    }
    if (now.weekday == DateTime.friday || now.weekday == DateTime.saturday || (now.weekday == DateTime.thursday && hour >= 17)) {
      autoEvents.add('funeral_cortege');
    }
    if (now.weekday == DateTime.wednesday || now.weekday == DateTime.saturday) {
      autoEvents.add('market_day');
    }

    // Récupération simultanée de la météo temps réel et du forecast
    final results = await Future.wait([
      CityFlowMobileApiService.fetchLiveWeather(provider.selectedCity),
      CityFlowMobileApiService.fetchAiForecast(
        city: provider.selectedCity,
        weather: 'auto',
        hour: hour,
        dayOfWeek: day,
        events: autoEvents,
      ),
    ]);

    if (mounted) {
      setState(() {
        _liveWeatherData = results[0];
        _aiForecastData = results[1];
        _isLoading = false;
      });

      // Lancement automatique du diagnostic prédictif de trajet
      _runTripPrediction();
    }
  }

  Future<void> _runTripPrediction() async {
    final provider = context.read<CityFlowProvider>();
    setState(() => _isPredictingTrip = true);

    final res = await CityFlowMobileApiService.predictTrip(
      city: provider.selectedCity,
      origin: _selectedTripOrigin,
      destination: _selectedTripDestination,
      departureHour: _selectedTripHour,
    );

    if (mounted) {
      setState(() {
        _tripPredictionResult = res;
        _isPredictingTrip = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final isYaounde = provider.selectedCity == 'Yaoundé';

    if (_lastCity != provider.selectedCity) {
      _lastCity = provider.selectedCity;
      _selectedTripOrigin = isYaounde ? 'Poste Centrale' : 'Boulevard de la Liberté';
      _selectedTripDestination = isYaounde ? 'Carrefour CRADAT' : 'Carrefour Ndokoti';
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadAllAiData();
      });
    }

    final now = DateTime.now();
    final hour = now.hour;
    final isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

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
            tooltip: 'Retour aux itinéraires',
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
                'Intelligence Artificielle & Prédictions',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.navy),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                '${provider.selectedCity} • Météo & Trafic réels',
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
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
              tooltip: 'Actualiser en direct',
              onPressed: _loadAllAiData,
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
                      'Analyse en direct des capteurs et de la météo...',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              )
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 36),
                children: [
                  // =========================================================
                  // 1. CARTE MÉTÉO AUTOMATIQUE EN DIRECT (SANS SÉLECTION MANUELLE)
                  // =========================================================
                  _buildLiveWeatherAutoCard(provider.selectedCity),

                  const SizedBox(height: 16),

                  // =========================================================
                  // 2. MODULE : ASSISTANT PRÉDICTIF DE TRAJET & OBSTACLES (EX: CRADAT À 17H)
                  // =========================================================
                  _buildTripPredictorSection(provider, isYaounde),

                  const SizedBox(height: 18),

                  // =========================================================
                  // 3. BANDEAU DE STATUT GLOBAL DE LA VILLE
                  // =========================================================
                  _buildDirectStatusBanner(provider, isRushHour),

                  const SizedBox(height: 18),

                  // =========================================================
                  // 4. ÉVOLUTION HEURE PAR HEURE DU TRAFIC
                  // =========================================================
                  _buildHourlyEvolutionSection(hour),

                  const SizedBox(height: 18),

                  // =========================================================
                  // 5. CARREFOURS CLÉS SOUS SURVEILLANCE IA
                  // =========================================================
                  _buildMonitoredNodesSection(provider, isYaounde),

                  const SizedBox(height: 18),

                  // =========================================================
                  // 6. ZONES À ÉVITER & CONTOURNEMENTS CONSEILLÉS
                  // =========================================================
                  _buildTroubleSpotsAndDetoursSection(provider, isYaounde),
                ],
              ),
      ),
    );
  }

  // =========================================================================
  // 1. CARTE MÉTÉO ANALYSÉE AUTOMATIQUEMENT PAR OPEN-METEO
  // =========================================================================
  Widget _buildLiveWeatherAutoCard(String city) {
    final current = _liveWeatherData?['current'] as Map<String, dynamic>?;
    final temp = current?['temperature'] ?? 24;
    final label = current?['label'] ?? 'Temps sec / Ensoleillé';
    final icon = current?['icon'] ?? '☀️';
    final rainMm = (current?['rainMm'] as num?)?.toDouble() ?? 0.0;
    final humidity = current?['humidity'] ?? 80;
    final wind = current?['windSpeedKmh'] ?? 8;
    final isLive = _liveWeatherData?['isLive'] == true;

    final hasRain = rainMm > 0 || (current?['conditionKey'] != 'dry' && current?['conditionKey'] != null);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: hasRain
              ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
              : [const Color(0xFF0284C7), const Color(0xFF0369A1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: (hasRain ? const Color(0xFF0F172A) : const Color(0xFF0284C7)).withValues(alpha: 0.25),
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
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        isLive ? 'MÉTÉO EN DIRECT (Open-Meteo)' : 'SURVEILLANCE MÉTÉO AUTOMATIQUE',
                        style: const TextStyle(
                          color: Color(0xFF6EE7B7),
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$city, Cameroun',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                icon,
                style: const TextStyle(fontSize: 34),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '$temp°C',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            label,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hasRain
                          ? 'Précipitations réelles : $rainMm mm • Humidité $humidity% • Vent $wind km/h'
                          : 'Chaussée sèche • Humidité $humidity% • Adhérence maximale (100%)',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.20),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome_rounded, color: Color(0xFFFDE047), size: 14),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    hasRain
                        ? 'L\'IA intègre automatiquement l\'impact de la pluie sur le calcul des temps de trajet.'
                        : 'Conditions idéales. Aucun ralentissement météo détecté.',
                    style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 2. ASSISTANT PRÉDICTIF DE TRAJET & OBSTACLES (EX: CRADAT À 17H)
  // =========================================================================
  Widget _buildTripPredictorSection(CityFlowProvider provider, bool isYaounde) {
    final ydeOptions = [
      'Carrefour CRADAT',
      'Poste Centrale',
      'Marché Mokolo',
      'Rond-point Bastos',
      'Carrefour Nlongkak',
      'Carrefour Mvan',
      'Carrefour Warda',
      'Rond-point Express (Biyem-Assi)',
    ];

    final dlaOptions = [
      'Carrefour Ndokoti',
      'Rond-point Deido',
      'Boulevard de la Liberté (Akwa)',
      'Marché Mboppi',
      'Plateau Administratif (Bonanjo)',
      'Rond-point Bonabéri',
      'Carrefour Bonamoussadi',
    ];

    final destinationList = isYaounde ? ydeOptions : dlaOptions;
    if (!destinationList.contains(_selectedTripDestination)) {
      _selectedTripDestination = destinationList.first;
    }
    if (!destinationList.contains(_selectedTripOrigin)) {
      _selectedTripOrigin = destinationList.length > 1 ? destinationList[1] : destinationList.first;
    }

    final res = _tripPredictionResult;
    final warnings = (res?['warnings'] as List<dynamic>?) ?? [];
    final roadStatusLabel = res?['roadStatusLabel'] ?? 'Calcul en cours...';
    final isBlocked = res?['isRoadBlocked'] == true || (res?['congestionScore'] as num? ?? 0) >= 75;
    final duration = res?['estimatedDurationMinutes'] ?? 45;
    final delay = res?['delayMinutes'] ?? 30;
    final weatherAtHour = res?['weatherAtTargetHour'] as Map<String, dynamic>?;
    final detour = res?['detourRecommendation'] as String?;
    final bestAdvice = res?['bestDepartureAdvice'] as String?;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.psychology_rounded, color: Color(0xFF0284C7), size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Prédire un trajet futur & ses obstacles',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14.5, color: AppColors.navy),
                    ),
                    Text(
                      'Prévision météo exacte, événements et risques de blocage',
                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Sélecteur Destination
          Row(
            children: [
              const SizedBox(
                width: 75,
                child: Text(
                  'Destination :',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
                ),
              ),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedTripDestination,
                      isExpanded: true,
                      style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.w700, fontSize: 12.5),
                      items: destinationList.map((dest) {
                        return DropdownMenuItem<String>(
                          value: dest,
                          child: Text(dest, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedTripDestination = val);
                          _runTripPrediction();
                        }
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Sélecteur Heure de départ
          Row(
            children: [
              const SizedBox(
                width: 75,
                child: Text(
                  'Heure :',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [12.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0].map((h) {
                      final isSelected = _selectedTripHour == h;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text('${h.toInt()}h00'),
                          selected: isSelected,
                          selectedColor: const Color(0xFF0284C7),
                          backgroundColor: const Color(0xFFF1F5F9),
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: isSelected ? Colors.white : const Color(0xFF475569),
                          ),
                          onSelected: (_) {
                            setState(() => _selectedTripHour = h);
                            _runTripPrediction();
                          },
                          visualDensity: VisualDensity.compact,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Résultat du diagnostic IA
          if (_isPredictingTrip)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0284C7)),
                    SizedBox(height: 8),
                    Text('Calcul prédictif multicritères en cours...', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            )
          else if (res != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isBlocked ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isBlocked ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ligne Statut et temps
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Icon(
                              isBlocked ? Icons.warning_amber_rounded : Icons.check_circle_outline_rounded,
                              color: isBlocked ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                roadStatusLabel,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: isBlocked ? const Color(0xFF991B1B) : const Color(0xFF166534),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isBlocked ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '~$duration min (+${delay}m)',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Météo prévue à cette heure
                  if (weatherAtHour != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Text(weatherAtHour['icon'] ?? '🌦️', style: const TextStyle(fontSize: 15)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Météo prévue à ${_selectedTripHour.toInt()}h : ${weatherAtHour['label']} (${weatherAtHour['temperature']}°C, ${weatherAtHour['precipitationProbability']}% de pluie)',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Alertes événements détectées sur l'axe
                  if (warnings.isNotEmpty)
                    ...warnings.map((w) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(w['icon'] ?? '⚠️', style: const TextStyle(fontSize: 15)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    w['title'] ?? '',
                                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF991B1B)),
                                  ),
                                  Text(
                                    w['description'] ?? '',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),

                  // Recommandation de contournement
                  if (detour != null && detour.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 6),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.alt_route_rounded, color: Color(0xFF0284C7), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              detour,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Conseil d'heure optimale
                  if (bestAdvice != null && bestAdvice.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          const Icon(Icons.schedule_rounded, color: Color(0xFF16A34A), size: 15),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              bestAdvice,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF15803D)),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // =========================================================================
  // 3. BANDEAU DE STATUT IMMÉDIAT
  // =========================================================================
  Widget _buildDirectStatusBanner(CityFlowProvider provider, bool isRushHour) {
    int congestion = 35;
    if (_aiForecastData != null && _aiForecastData!['currentCongestion'] != null) {
      congestion = (_aiForecastData!['currentCongestion'] as num).round();
    } else if (provider.currentNodes.isNotEmpty) {
      final total = provider.currentNodes.map((n) => n.congestionLevel).reduce((a, b) => a + b);
      congestion = (total / provider.currentNodes.length).round();
    }

    final isFluid = congestion < 40;
    final isModerate = congestion >= 40 && congestion <= 75;

    final Color bgColor = isFluid
        ? const Color(0xFF064E3B)
        : isModerate
            ? const Color(0xFF78350F)
            : const Color(0xFF7C2D12);

    final Color badgeColor = isFluid
        ? const Color(0xFF10B981)
        : isModerate
            ? const Color(0xFFF59E0B)
            : const Color(0xFFEA580C);

    final IconData icon = isFluid
        ? Icons.check_circle_rounded
        : isModerate
            ? Icons.info_rounded
            : Icons.warning_rounded;

    final String title = isFluid
        ? '🟢 CIRCULATION ACTUELLEMENT FLUIDE ($congestion%)'
        : isModerate
            ? '🟡 TRAFIC MODÉRÉ / RALENTISSEMENTS ($congestion%)'
            : '🚨 GROS BOUCHONS / RÉSEAU SATURÉ ($congestion%)';

    final String explanation = isFluid
        ? 'Les grands axes et carrefours de ${provider.selectedCity} roulent bien en ce moment. Vous pouvez circuler librement.'
        : isModerate
            ? 'Ralentissements constatés sur plusieurs carrefours clés de ${provider.selectedCity}. Prévoyez 5 à 15 min supplémentaires ou empruntez les déviations.'
            : 'Forte saturation constatée sur le réseau urbain de ${provider.selectedCity}. Pour éviter d\'être coincé, empruntez les axes secondaires recommandés ci-dessous.';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: bgColor,
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
                  color: badgeColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 13.5,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            explanation,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12.5,
              height: 1.4,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 4. ÉVOLUTION DU TRAFIC HEURE PAR HEURE
  // =========================================================================
  Widget _buildHourlyEvolutionSection(int currentHour) {
    final forecastList = (_aiForecastData?['globalForecast'] as List<dynamic>?) ?? [];
    final now = DateTime.now();

    final displayHorizons = forecastList.isNotEmpty
        ? forecastList.map((f) {
            final int cong = (f['congestionPercentage'] as num?)?.round() ?? 40;
            final isFluid = cong < 40;
            final isMod = cong >= 40 && cong <= 75;
            final offsetMin = (f['offsetMinutes'] as num?)?.toInt() ?? 60;

            String timeLabel = f['time'] as String? ?? '';
            if (timeLabel.isEmpty) {
              final target = now.add(Duration(minutes: offsetMin));
              timeLabel = '${target.hour}h${target.minute.toString().padLeft(2, '0')}';
            }

            return {
              'time': timeLabel,
              'horizon': f['horizon'] as String? ?? '+1h',
              'congestion': cong,
              'status': isFluid ? 'Fluide' : (isMod ? 'Modéré' : 'Bouché'),
              'color': isFluid ? const Color(0xFF10B981) : (isMod ? const Color(0xFFF59E0B) : const Color(0xFFDC2626)),
            };
          }).toList()
        : [
            {'time': '${now.add(const Duration(minutes: 15)).hour}h${now.add(const Duration(minutes: 15)).minute.toString().padLeft(2, '0')}', 'horizon': '+15 min', 'congestion': 70, 'status': 'Modéré', 'color': const Color(0xFFF59E0B)},
            {'time': '${now.add(const Duration(minutes: 30)).hour}h${now.add(const Duration(minutes: 30)).minute.toString().padLeft(2, '0')}', 'horizon': '+30 min', 'congestion': 74, 'status': 'Modéré', 'color': const Color(0xFFF59E0B)},
            {'time': '${now.add(const Duration(hours: 1)).hour}h${now.add(const Duration(hours: 1)).minute.toString().padLeft(2, '0')}', 'horizon': '+1 heure', 'congestion': 84, 'status': 'Critique', 'color': const Color(0xFFDC2626)},
            {'time': '${now.add(const Duration(hours: 2)).hour}h${now.add(const Duration(hours: 2)).minute.toString().padLeft(2, '0')}', 'horizon': '+2 heures', 'congestion': 89, 'status': 'Critique', 'color': const Color(0xFFDC2626)},
          ];

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Évolution prévisionnelle du trafic',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.navy),
              ),
              Icon(Icons.timeline_rounded, color: Color(0xFF0284C7), size: 20),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: displayHorizons.take(4).map((h) {
              final int cong = h['congestion'] as int;
              final Color col = h['color'] as Color;
              return Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
                  decoration: BoxDecoration(
                    color: col.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: col.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        h['time'] as String,
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.navy),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        h['horizon'] as String,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '$cong%',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: col),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        h['status'] as String,
                        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: col),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 5. CARREFOURS SOUS SURVEILLANCE
  // =========================================================================
  Widget _buildMonitoredNodesSection(CityFlowProvider provider, bool isYaounde) {
    final nodes = provider.currentNodes;
    if (nodes.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Carrefours clés sous surveillance',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.navy),
        ),
        const SizedBox(height: 10),
        ...nodes.take(5).map((node) {
          final isFluid = node.congestionLevel < 40;
          final isMod = node.congestionLevel >= 40 && node.congestionLevel <= 75;
          final col = isFluid ? const Color(0xFF10B981) : (isMod ? const Color(0xFFF59E0B) : const Color(0xFFDC2626));

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(color: col, shape: BoxShape.circle),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(node.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5, color: AppColors.navy)),
                      Text(
                        'Vitesse moy : ${node.averageSpeedKmh.round()} km/h • Retard : +${node.estimatedDelayMinutes} min',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: col.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${node.congestionLevel}%',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: col),
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
  // 6. ZONES À ÉVITER & CONTOURNEMENTS
  // =========================================================================
  Widget _buildTroubleSpotsAndDetoursSection(CityFlowProvider provider, bool isYaounde) {
    final spots = isYaounde
        ? [
            {
              'name': 'Carrefour CRADAT & Sortie Université',
              'issue': 'Affluence massive sortie d\'amphis & stationnement de taxis',
              'detour': 'Passer par le haut de Ngoa-Ekellé ou par Bastos / Dragages',
              'timeSaved': '~25 min',
            },
            {
              'name': 'Carrefour Nlongkak (Axe principal)',
              'issue': 'Gros nœud de circulation & risque d\'inondation au bas-fond',
              'detour': 'Contourner par le Boulevard de l\'URSS / Bastos',
              'timeSaved': '~20 min',
            },
          ]
        : [
            {
              'name': 'Carrefour Ndokoti (Total)',
              'issue': 'Engorgement dense, motos-taxis & chaussée inondable',
              'detour': 'Passer par la Cité des Palmiers ou Logbaba',
              'timeSaved': '~30 min',
            },
            {
              'name': 'Rond-point Deido (Accès Pont Wouri)',
              'issue': 'Goulot d\'étranglement vers Bonabéri',
              'detour': 'Emprunter le Boulevard de la République',
              'timeSaved': '~25 min',
            },
          ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Zones critiques & Déviations recommandées',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.navy),
        ),
        const SizedBox(height: 10),
        ...spots.map((spot) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.fmd_bad_rounded, color: Color(0xFFDC2626), size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        spot['name']!,
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12.5, color: Color(0xFF991B1B)),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFDC2626).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                      child: const Text('À ÉVITER', style: TextStyle(color: Color(0xFFDC2626), fontSize: 10, fontWeight: FontWeight.w900)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  spot['issue']!,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.alt_route_rounded, color: Color(0xFF16A34A), size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '💡 ${spot['detour']!}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF166534), fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }}
