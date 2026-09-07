import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/city_data.dart';
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

  // Simulateur prédictif de trajet futur (dynamiquement ancré dans le futur)
  String _selectedTripOrigin = 'Poste Centrale';
  String _selectedTripDestination = '';
  double _selectedTripHour = 17.0;
  bool _isTripTomorrow = false;
  String _formattedDepartureTime = '';
  TextEditingController? _destinationFieldController;

  String? _lastCity;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final in15 = now.add(const Duration(minutes: 15));
    _selectedTripHour = in15.hour + (in15.minute / 60.0);
    _isTripTomorrow = in15.day != now.day;
    _formattedDepartureTime = '${in15.hour.toString().padLeft(2, '0')}h${in15.minute.toString().padLeft(2, '0')} (Aujourd\'hui)';
    _loadAllAiData();
  }

  void _setRelativeDepartureTime(Duration offset, {bool isTomorrow = false}) {
    final now = DateTime.now();
    DateTime target = now.add(offset);
    if (isTomorrow) {
      target = DateTime(now.year, now.month, now.day + 1, target.hour, target.minute);
    }
    final hourVal = target.hour + (target.minute / 60.0);
    final isTmw = isTomorrow || target.day != now.day;
    final timeStr = '${target.hour.toString().padLeft(2, '0')}h${target.minute.toString().padLeft(2, '0')}';
    final formatted = offset.inMinutes == 0 && !isTmw
        ? 'Maintenant ($timeStr)'
        : (isTmw ? '$timeStr (Demain)' : '$timeStr (Aujourd\'hui)');

    setState(() {
      _selectedTripHour = hourVal;
      _isTripTomorrow = isTmw;
      _formattedDepartureTime = formatted;
    });
    _runTripPrediction();
  }

  Future<void> _pickCustomTime() async {
    final now = DateTime.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: (now.hour + 1) % 24,
        minute: 0,
      ),
      helpText: 'CHOISIR L\'HEURE DE DÉPART',
      cancelText: 'ANNULER',
      confirmText: 'SÉLECTIONNER',
    );
    if (picked != null) {
      final hourVal = picked.hour + (picked.minute / 60.0);
      final isPast = picked.hour < now.hour || (picked.hour == now.hour && picked.minute < now.minute);
      final isTomorrow = isPast;
      final timeStr = '${picked.hour.toString().padLeft(2, '0')}h${picked.minute.toString().padLeft(2, '0')}';
      final formatted = isTomorrow ? '$timeStr (Demain)' : '$timeStr (Aujourd\'hui)';

      setState(() {
        _selectedTripHour = hourVal;
        _isTripTomorrow = isTomorrow;
        _formattedDepartureTime = formatted;
      });

      if (isPast && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF0F172A),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            content: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: Color(0xFF38BDF8), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '$timeStr étant déjà passée aujourd\'hui, l\'anticipation IA a été calculée pour Demain.',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        );
      }

      _runTripPrediction();
    }
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

      // Lancement automatique du diagnostic prédictif uniquement si une destination est définie
      if (_selectedTripDestination.trim().isNotEmpty) {
        _runTripPrediction();
      }
    }
  }

  Future<void> _runTripPrediction() async {
    if (_selectedTripDestination.trim().isEmpty) {
      if (mounted) {
        setState(() {
          _tripPredictionResult = null;
          _isPredictingTrip = false;
        });
      }
      return;
    }

    final provider = context.read<CityFlowProvider>();
    setState(() => _isPredictingTrip = true);

    final targetDate = _isTripTomorrow
        ? DateTime.now().add(const Duration(days: 1))
        : DateTime.now();

    final res = await CityFlowMobileApiService.predictTrip(
      city: provider.selectedCity,
      origin: _selectedTripOrigin,
      destination: _selectedTripDestination,
      departureHour: _selectedTripHour,
      departureDate: targetDate.toIso8601String(),
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
      _selectedTripDestination = '';
      _tripPredictionResult = null;
      _destinationFieldController?.clear();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadAllAiData();
      });
    }

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
                  // 2. MODULE : ASSISTANT PRÉDICTIF DE TRAJET & OBSTACLES
                  // =========================================================
                  _buildTripPredictorSection(provider, isYaounde),

                  // =========================================================
                  // 3. LISTE DES TRAJETS PLANIFIÉS ACTIFS AVEC RAPPELS IA
                  // =========================================================
                  _buildScheduledTripsSection(provider),
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
    final landmarks = CityData.getLandmarks(provider.selectedCity);
    final nodes = provider.currentNodes.map((n) => n.name).toList();
    final allPlaces = <String>{
      ...landmarks.map((l) => l.name),
      ...nodes,
    }.toList();

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

          // Zone de recherche Destination (Recherche libre + suggestions en direct)
          const Text(
            'Destination :',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
          ),
          const SizedBox(height: 6),
          LayoutBuilder(
            builder: (context, constraints) {
              return Autocomplete<String>(
                initialValue: TextEditingValue(text: _selectedTripDestination),
                optionsBuilder: (TextEditingValue textEditingValue) {
                  final query = textEditingValue.text.trim().toLowerCase();
                  if (query.isEmpty) {
                    return isYaounde
                        ? ['Carrefour CRADAT', 'Marché Mokolo', 'Poste Centrale', 'Rond-point Bastos', 'Carrefour Nlongkak', 'Carrefour Mvan']
                        : ['Carrefour Ndokoti', 'Rond-point Deido', 'Boulevard de la Liberté (Akwa)', 'Marché Mboppi', 'Plateau Administratif (Bonanjo)'];
                  }
                  return allPlaces.where((p) => p.toLowerCase().contains(query)).take(8);
                },
                onSelected: (String selection) {
                  setState(() => _selectedTripDestination = selection);
                  _runTripPrediction();
                },
                fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                  _destinationFieldController = controller;
                  return TextField(
                    controller: controller,
                    focusNode: focusNode,
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Rechercher un lieu, carrefour, quartier...',
                      hintStyle: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF0284C7), size: 20),
                      suffixIcon: controller.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF94A3B8)),
                              onPressed: () {
                                controller.clear();
                                setState(() {
                                  _selectedTripDestination = '';
                                  _tripPredictionResult = null;
                                });
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF0284C7), width: 1.5),
                      ),
                    ),
                    onSubmitted: (val) {
                      if (val.trim().isNotEmpty) {
                        setState(() => _selectedTripDestination = val.trim());
                        _runTripPrediction();
                      }
                    },
                  );
                },
                optionsViewBuilder: (context, onSelected, options) {
                  return Align(
                    alignment: Alignment.topLeft,
                    child: Material(
                      elevation: 8,
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.white,
                      child: Container(
                        width: constraints.maxWidth,
                        constraints: const BoxConstraints(maxHeight: 220),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          shrinkWrap: true,
                          itemCount: options.length,
                          separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          itemBuilder: (context, index) {
                            final option = options.elementAt(index);
                            final landmark = CityData.findLandmark(provider.selectedCity, option);
                            return ListTile(
                              dense: true,
                              visualDensity: VisualDensity.compact,
                              leading: const Icon(Icons.location_on_outlined, color: Color(0xFF0284C7), size: 18),
                              title: Text(
                                option,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: AppColors.navy),
                              ),
                              subtitle: landmark != null && landmark.district.isNotEmpty
                                  ? Text(landmark.district, style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)))
                                  : null,
                              onTap: () => onSelected(option),
                            );
                          },
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
          const SizedBox(height: 8),

          // Raccourcis rapides de destinations
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: (isYaounde
                      ? ['CRADAT', 'Mokolo', 'Bastos', 'Nlongkak', 'Mvan', 'Poste Centrale']
                      : ['Ndokoti', 'Deido', 'Akwa', 'Mboppi', 'Bonanjo', 'Bonamoussadi'])
                  .map((shortcut) {
                final isMatch = _selectedTripDestination.toLowerCase().contains(shortcut.toLowerCase());
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: InkWell(
                      onTap: () {
                        final fullName = isYaounde
                            ? (shortcut == 'CRADAT'
                                ? 'Carrefour CRADAT'
                                : (shortcut == 'Mokolo'
                                    ? 'Marché Mokolo'
                                    : (shortcut == 'Bastos'
                                        ? 'Rond-point Bastos'
                                        : (shortcut == 'Nlongkak'
                                            ? 'Carrefour Nlongkak'
                                            : (shortcut == 'Mvan'
                                                ? 'Carrefour Mvan'
                                                : 'Poste Centrale')))))
                            : (shortcut == 'Ndokoti'
                                ? 'Carrefour Ndokoti'
                                : (shortcut == 'Deido'
                                    ? 'Rond-point Deido'
                                    : (shortcut == 'Akwa'
                                        ? 'Boulevard de la Liberté (Akwa)'
                                        : (shortcut == 'Mboppi'
                                            ? 'Marché Mboppi'
                                            : (shortcut == 'Bonanjo'
                                                ? 'Plateau Administratif (Bonanjo)'
                                                : 'Carrefour Bonamoussadi')))));
                        _destinationFieldController?.text = fullName;
                        setState(() => _selectedTripDestination = fullName);
                        _runTripPrediction();
                      },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: isMatch ? const Color(0xFF0284C7).withValues(alpha: 0.12) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isMatch ? const Color(0xFF0284C7) : const Color(0xFFE2E8F0),
                          width: isMatch ? 1.2 : 1,
                        ),
                      ),
                      child: Text(
                        shortcut,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isMatch ? FontWeight.w800 : FontWeight.w600,
                          color: isMatch ? const Color(0xFF0284C7) : const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),

          // Raccourcis rapides d'heures futures (ancrés dans le présent)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTimeShortcutChip('⚡ Maintenant', const Duration(minutes: 0)),
                _buildTimeShortcutChip('+15 min', const Duration(minutes: 15)),
                _buildTimeShortcutChip('+30 min', const Duration(minutes: 30)),
                _buildTimeShortcutChip('+1h', const Duration(hours: 1)),
                _buildTimeShortcutChip('+2h', const Duration(hours: 2)),
                _buildTimeShortcutChip('📅 Demain', const Duration(minutes: 0), isTomorrow: true),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Sélecteur Heure de départ personnalisée (choix direct par l'utilisateur)
          InkWell(
            onTap: _pickCustomTime,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.access_time_rounded, size: 17, color: Color(0xFF0284C7)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _formattedDepartureTime.isNotEmpty
                          ? 'Départ : $_formattedDepartureTime'
                          : 'Départ : Choisir l\'heure...',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0284C7),
                      borderRadius: BorderRadius.circular(7),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.edit_calendar_rounded, size: 12, color: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'Changer',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Résultat du diagnostic IA
          if (_selectedTripDestination.trim().isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.touch_app_rounded, color: Color(0xFF0284C7), size: 22),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Choisissez ou saisissez une destination ci-dessus pour lancer l\'analyse prédictive IA.',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                  ),
                ],
              ),
            )
          else if (_isPredictingTrip)
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
            // 1. Alerte OS1 en Langage Naturel & Fiabilité
            _buildPredictionAlertCard(
              res['timeline']?['alert_message'] as String?,
              (res['timeline']?['confidence'] as num?)?.toDouble() ?? 0.85,
              (res['timeline']?['causes'] as List?)?.map((e) => e.toString()).toList() ?? [],
            ),

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
                              'Météo prévue ${_isTripTomorrow ? 'demain' : 'aujourd\'hui'} à $_formattedDepartureTime : ${weatherAtHour['label']} (${weatherAtHour['temperature']}°C, ${weatherAtHour['precipitationProbability']}% de pluie)',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Alertes événements détectées sur l'axe
                  if (warnings.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Column(
                        children: warnings.map((w) {
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
                        }).toList(),
                      ),
                    ),

                  // Recommandation de contournement
                  if (detour != null && detour.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
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

          const SizedBox(height: 16),

          // Bouton principal de confirmation & planification
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: _selectedTripDestination.trim().isNotEmpty ? const Color(0xFF0284C7) : const Color(0xFF94A3B8),
                foregroundColor: Colors.white,
                elevation: _selectedTripDestination.trim().isNotEmpty ? 2 : 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
              label: const Text(
                'Confirmer & Planifier ce trajet',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
              ),
              onPressed: _selectedTripDestination.trim().isNotEmpty ? () => _confirmAndSaveTrip(provider) : null,
            ),
          ),
        ],
      ),
    );
  }

  void _confirmAndSaveTrip(CityFlowProvider provider) {
    if (_selectedTripDestination.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez spécifier une destination')),
      );
      return;
    }

    final originPos = provider.userRealPosition ?? provider.currentCityCenter;
    final destLandmark = CityData.findLandmark(provider.selectedCity, _selectedTripDestination);
    final destPos = destLandmark?.pos ??
        (provider.selectedCity == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter);

    final targetH = _selectedTripHour.floor();
    final targetM = ((_selectedTripHour - targetH) * 60).round();
    final targetTime = TimeOfDay(hour: targetH % 24, minute: targetM % 60);

    final targetDate = _isTripTomorrow
        ? DateTime.now().add(const Duration(days: 1))
        : DateTime.now();

    provider.planTripWithAi(
      title: 'Trajet vers $_selectedTripDestination',
      originName: _selectedTripOrigin,
      originPos: originPos,
      destinationName: _selectedTripDestination,
      destinationPos: destPos,
      targetTime: targetTime,
      date: targetDate,
      isDepartureMode: true,
      weather: 'auto',
    );

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Trajet vers $_selectedTripDestination planifié !',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                  ),
                  Text(
                    'Départ prévu à $_formattedDepartureTime • Rappel IA activé (15 min avant)',
                    style: const TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );

    setState(() {});
  }

  Widget _buildPredictionAlertCard(String? alertMessage, double confidence, List<String> causes) {
    final isWarning = alertMessage != null && alertMessage.isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isWarning ? const Color(0xFFFEF3C7).withValues(alpha: 0.6) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isWarning ? const Color(0xFFFDE68A) : const Color(0xFFBBF7D0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isWarning ? const Color(0xFFF59E0B).withValues(alpha: 0.15) : const Color(0xFF10B981).withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isWarning ? Icons.warning_amber_rounded : Icons.verified_user_rounded,
              size: 18,
              color: isWarning ? const Color(0xFFD97706) : const Color(0xFF16A34A),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isWarning ? alertMessage : 'Aucun bouchon critique prévu',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: isWarning ? const Color(0xFF92400E) : const Color(0xFF166534),
                  ),
                ),
                if (!isWarning)
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Text(
                      'La circulation devrait rester fluide sur les 2 prochaines heures.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF15803D), fontWeight: FontWeight.w600),
                    ),
                  ),
                if (isWarning && causes.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: causes.map((c) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFDE68A),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                c.contains('pluie') || c.contains('orage')
                                    ? '🌧️'
                                    : (c.contains('cours') || c.contains('amphi'))
                                        ? '🎓'
                                        : (c.contains('marché'))
                                            ? '🛒'
                                            : (c.contains('travaux'))
                                                ? '🚧'
                                                : (c.contains('cortège') || c.contains('deuil'))
                                                    ? '⚰️'
                                                    : (c.contains('évènement'))
                                                        ? '📅'
                                                        : '🕒',
                                style: const TextStyle(fontSize: 11),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                c,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF92400E)),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    'Fiabilité estimée du modèle IA : ${(confidence * 100).round()}%',
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeShortcutChip(String label, Duration offset, {bool isTomorrow = false}) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: InkWell(
        onTap: () => _setRelativeDepartureTime(offset, isTomorrow: isTomorrow),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFF0284C7).withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFBAE6FD)),
          ),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0284C7),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildScheduledTripsSection(CityFlowProvider provider) {
    final scheduledTrips = provider.currentCityScheduledTrips;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Trajets Planifiés (${scheduledTrips.length})',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 15,
                color: AppColors.navy,
              ),
            ),
            Text(
              'Heure locale',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (scheduledTrips.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Column(
                children: [
                  Icon(Icons.event_available_rounded, size: 36, color: Color(0xFF94A3B8)),
                  SizedBox(height: 8),
                  Text(
                    'Aucun trajet planifié pour le moment.',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Cliquez sur "Confirmer & Planifier" ci-dessus pour activer un rappel intelligent.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else
          ...scheduledTrips.map((trip) {
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0284C7).withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.event_note_rounded, color: Color(0xFF0284C7), size: 16),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                trip.title.isNotEmpty ? trip.title : trip.destinationName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13.5,
                                  color: AppColors.navy,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFDC2626), size: 18),
                        tooltip: 'Supprimer ce trajet',
                        onPressed: () {
                          provider.removeScheduledTrip(trip.id);
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.access_time_rounded, size: 12, color: Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Text(
                              'Départ : ${trip.formattedDepartureTime}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: trip.statusColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            trip.roadStatusLabel,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: trip.statusColor,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        final destName = trip.destinationName.isNotEmpty ? trip.destinationName : trip.title;
                        final origName = trip.originName.isNotEmpty ? trip.originName : 'Ma position (GPS)';
                        provider.triggerRouteOverview(
                          originName: origName,
                          destinationName: destName,
                        );
                        provider.fetchSmartRoutes(
                          origin: trip.originPos,
                          destination: trip.destinationPos,
                          originName: origName,
                          destinationName: destName,
                          showOverview: true,
                        );
                        if (Navigator.canPop(context)) {
                          Navigator.pop(context);
                        }
                        widget.onNavigateTab?.call(0);
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Ink(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0284C7).withValues(alpha: 0.25),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.directions_rounded, size: 16, color: Colors.white),
                            SizedBox(width: 8),
                            Text(
                              'Voir l\'itinéraire',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}
