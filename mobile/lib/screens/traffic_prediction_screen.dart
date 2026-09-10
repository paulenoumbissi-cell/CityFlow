import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/city_data.dart';
import '../core/services/api_service.dart';
import '../core/services/location_service.dart';
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

  // Mode de routage : 'comfort' (routes bitumées) ou 'speed' (plus rapide)
  String _routeMode = 'comfort';

  // GPS : position de l'utilisateur pour l'origine
  bool _isLoadingGps = false;
  bool _isGpsOrigin = false; // true si l'origine est la position GPS

  // Simulateur prédictif de trajet futur (dynamiquement ancré dans le futur)
  String _selectedTripOrigin = 'Poste Centrale';
  String _selectedTripDestination = '';
  double _selectedTripHour = 17.0;
  bool _isTripTomorrow = false;
  String _formattedDepartureTime = '';
  TextEditingController? _destinationFieldController;
  TextEditingController? _originFieldController;

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

  /// Récupère la position GPS de l'utilisateur et la définit comme point de départ
  Future<void> _fetchUserGpsOrigin() async {
    setState(() => _isLoadingGps = true);
    try {
      final result = await LocationService.detectUserCity();
      if (!mounted) return;
      final label = result.isGpsLive ? '📍 Ma position actuelle' : '📍 Centre-ville (GPS indispo.)';
      setState(() {
        _selectedTripOrigin = label;
        _isGpsOrigin = true;
        _originFieldController?.text = label;
        _isLoadingGps = false;
      });
      if (_selectedTripDestination.trim().isNotEmpty) {
        _runTripPrediction();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingGps = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF0F172A),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          content: const Row(
            children: [
              Icon(Icons.location_off_rounded, color: Color(0xFFF87171), size: 18),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Impossible d\'obtenir votre position GPS. Vérifiez les permissions.',
                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );
    }
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
      routeMode: _routeMode,
    );

    if (mounted) {
      setState(() {
        _tripPredictionResult = res;
        _isPredictingTrip = false;
      });

      // Sauvegarde dans l'historique des trajets
      if (res != null) {
        final destLandmark = CityData.findLandmark(provider.selectedCity, _selectedTripDestination);
        final isYde = provider.selectedCity == 'Yaoundé';
        final destPos = destLandmark?.pos ?? (isYde ? CityData.yaoundeCenter : CityData.doualaCenter);
        provider.addToTripHistory(
          title: '$_selectedTripOrigin → $_selectedTripDestination',
          subtitle: '${_routeMode == "comfort" ? "🛣️ Confort" : "⚡ Vitesse"} • $_formattedDepartureTime',
          destinationPos: destPos,
          category: 'recent_route',
        );
      }
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
    final res = _tripPredictionResult;
    final warnings = (res?['warnings'] as List<dynamic>?) ?? [];
    final roadStatusLabel = res?['roadStatusLabel'] ?? 'Calcul en cours...';
    final isBlocked = res?['isRoadBlocked'] == true || (res?['congestionScore'] as num? ?? 0) >= 75;
    final duration = res?['estimatedDurationMinutes'] ?? 45;
    final delay = res?['delayMinutes'] ?? 30;
    final weatherAtHour = res?['weatherAtTargetHour'] as Map<String, dynamic>?;
    final detour = res?['detourRecommendation'] as String?;
    final bestAdvice = res?['bestDepartureAdvice'] as String?;
    final corridorWaypoints = (res?['corridorWaypoints'] as List<dynamic>?) ?? [];
    final criticalBottleneck = res?['criticalBottleneck'] as Map<String, dynamic>?;

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
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1A3A6B), Color(0xFF22A832)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 20),
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
          const SizedBox(height: 14),

          // --- RECHERCHES RÉCENTES (1-Tap reload) ---
          _buildRecentSearchesSection(provider),

          // Point de départ (Origine) + bouton GPS
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Point de départ :',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Bouton GPS : Ma position
                  InkWell(
                    onTap: _isLoadingGps ? null : _fetchUserGpsOrigin,
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: _isLoadingGps
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.8, color: Color(0xFF22A832)),
                            )
                          : Row(
                              children: [
                                Icon(
                                  _isGpsOrigin ? Icons.gps_fixed_rounded : Icons.gps_not_fixed_rounded,
                                  size: 13,
                                  color: _isGpsOrigin ? const Color(0xFF22A832) : const Color(0xFF64748B),
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  _isGpsOrigin ? 'GPS actif' : 'Ma position',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    color: _isGpsOrigin ? const Color(0xFF22A832) : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  // Bouton Inverser
                  InkWell(
                    onTap: () {
                      if (_selectedTripDestination.trim().isNotEmpty) {
                        final oldOrig = _selectedTripOrigin;
                        final oldDest = _selectedTripDestination;
                        setState(() {
                          _selectedTripOrigin = oldDest;
                          _selectedTripDestination = oldOrig;
                          _isGpsOrigin = false;
                        });
                        _originFieldController?.text = oldDest;
                        _destinationFieldController?.text = oldOrig;
                        _runTripPrediction();
                      }
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        children: [
                          Icon(Icons.swap_vert_rounded, size: 15, color: Color(0xFF0284C7)),
                          SizedBox(width: 4),
                          Text(
                            'Inverser',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0284C7)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          LayoutBuilder(
            builder: (context, constraints) {
              return Autocomplete<String>(
                initialValue: TextEditingValue(text: _selectedTripOrigin),
                optionsBuilder: (TextEditingValue textEditingValue) {
                  final query = textEditingValue.text.trim();
                  final places = CityData.searchPlaces(query, provider.selectedCity);
                  return places.map((l) => l.name).take(10);
                },
                onSelected: (String selection) {
                  setState(() => _selectedTripOrigin = selection);
                  if (_selectedTripDestination.trim().isNotEmpty) {
                    _runTripPrediction();
                  }
                },
                fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                  _originFieldController = controller;
                  return TextField(
                    controller: controller,
                    focusNode: focusNode,
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5,
                    ),
                    onChanged: (val) {
                      if (_isGpsOrigin) setState(() => _isGpsOrigin = false);
                    },
                    decoration: InputDecoration(
                      hintText: 'Origine (ex: Poste Centrale, Bastos...)',
                      hintStyle: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                      ),
                      prefixIcon: Icon(
                        _isGpsOrigin ? Icons.gps_fixed_rounded : Icons.my_location_rounded,
                        color: _isGpsOrigin ? const Color(0xFF22A832) : const Color(0xFF10B981),
                        size: 18,
                      ),
                      filled: true,
                      fillColor: _isGpsOrigin ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(
                          color: _isGpsOrigin ? const Color(0xFF22A832) : const Color(0xFFCBD5E1),
                          width: _isGpsOrigin ? 1.5 : 1.0,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                      ),
                    ),
                    onSubmitted: (val) {
                      if (val.trim().isNotEmpty) {
                        setState(() {
                          _selectedTripOrigin = val.trim();
                          _isGpsOrigin = false;
                        });
                        if (_selectedTripDestination.trim().isNotEmpty) {
                          _runTripPrediction();
                        }
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
                              leading: const Icon(Icons.my_location_rounded, color: Color(0xFF10B981), size: 18),
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
          const SizedBox(height: 14),

          // Zone de recherche Destination (Recherche universelle de tous les lieux réels)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Destination recherchée :',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7).withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  '180+ lieux reconnus',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0284C7)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          LayoutBuilder(
            builder: (context, constraints) {
              return Autocomplete<String>(
                initialValue: TextEditingValue(text: _selectedTripDestination),
                optionsBuilder: (TextEditingValue textEditingValue) {
                  final query = textEditingValue.text.trim();
                  final places = CityData.searchPlaces(query, provider.selectedCity);
                  return places.map((l) => l.name).take(12);
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
                      hintText: 'Ex: Collège Vogt, Biyem-Assi, Mendong, Olembe...',
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
                        constraints: const BoxConstraints(maxHeight: 240),
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

                            IconData catIcon = Icons.location_on_rounded;
                            Color catColor = const Color(0xFF0284C7);
                            String catBadge = 'Lieu';

                            if (landmark != null) {
                              if (landmark.category == 'university') {
                                catIcon = Icons.school_rounded;
                                catColor = const Color(0xFF2563EB);
                                catBadge = 'Éducation';
                              } else if (landmark.category == 'hospital') {
                                catIcon = Icons.local_hospital_rounded;
                                catColor = const Color(0xFFEF4444);
                                catBadge = 'Santé';
                              } else if (landmark.category == 'mall') {
                                catIcon = Icons.shopping_bag_rounded;
                                catColor = const Color(0xFFF59E0B);
                                catBadge = 'Commerce';
                              } else if (landmark.category == 'transport') {
                                catIcon = Icons.directions_bus_rounded;
                                catColor = const Color(0xFF10B981);
                                catBadge = 'Transport';
                              } else if (landmark.category == 'hotel') {
                                catIcon = Icons.hotel_rounded;
                                catColor = const Color(0xFF8B5CF6);
                                catBadge = 'Hôtel';
                              } else {
                                catIcon = Icons.traffic_rounded;
                                catColor = const Color(0xFF0284C7);
                                catBadge = 'Carrefour';
                              }
                            }

                            return ListTile(
                              dense: true,
                              visualDensity: VisualDensity.compact,
                              leading: Container(
                                padding: const EdgeInsets.all(5),
                                decoration: BoxDecoration(
                                  color: catColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(catIcon, color: catColor, size: 16),
                              ),
                              title: Text(
                                option,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: AppColors.navy),
                              ),
                              subtitle: landmark != null && landmark.district.isNotEmpty
                                  ? Text(
                                      '${landmark.district} • $catBadge',
                                      style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                                    )
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

          // Raccourcis rapides de destinations populaires
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: (isYaounde
                      ? ['CRADAT', 'Collège Vogt', 'Biyem-Assi', 'Mendong', 'Mokolo', 'Bastos', 'Nlongkak', 'Etoudi']
                      : ['Ndokoti', 'Deido', 'Akwa', 'Bonamoussadi', 'Makepe', 'Kotto', 'Mboppi', 'Bonabéri'])
                  .map((shortcut) {
                final isMatch = _selectedTripDestination.toLowerCase().contains(shortcut.toLowerCase());
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: InkWell(
                    onTap: () {
                      final fullName = isYaounde
                          ? (shortcut == 'CRADAT'
                              ? 'Carrefour CRADAT (Université Yaoundé I)'
                              : (shortcut == 'Collège Vogt'
                                  ? 'Collège Vogt (Mvolyé)'
                                  : (shortcut == 'Biyem-Assi'
                                      ? 'Carrefour Biyem-Assi (Rond-point Express)'
                                      : (shortcut == 'Mendong'
                                          ? 'Carrefour Mendong'
                                          : (shortcut == 'Mokolo'
                                              ? 'Marché Mokolo'
                                              : (shortcut == 'Bastos'
                                                  ? 'Bastos (Ambassades)'
                                                  : (shortcut == 'Nlongkak'
                                                      ? 'Carrefour Nlongkak'
                                                      : 'Carrefour Etoudi (Palais de l\'Unité)')))))))
                          : (shortcut == 'Ndokoti'
                              ? 'Carrefour Ndokoti (Axe Lourd)'
                              : (shortcut == 'Deido'
                                  ? 'Rond-point Deido'
                                  : (shortcut == 'Akwa'
                                      ? 'Carrefour Akwa (Boulevard Liberté)'
                                      : (shortcut == 'Bonamoussadi'
                                          ? 'Rond-point Bonamoussadi (Maetur)'
                                          : (shortcut == 'Makepe'
                                              ? 'Carrefour Makepe (Missoke)'
                                              : (shortcut == 'Kotto'
                                                  ? 'Carrefour Kotto'
                                                  : (shortcut == 'Mboppi'
                                                      ? 'Marché Mboppi'
                                                      : 'Carrefour Bonabéri (Ancien Pont)')))))));
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

          const SizedBox(height: 12),

          // --- SÉLECTEUR DE MODE DE ROUTE (VITESSE VS CONFORT) ---
          _buildRouteModeSelector(),

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

            if (corridorWaypoints.isNotEmpty)
              _buildCorridorWaypointsSection(corridorWaypoints, criticalBottleneck),
          ],

          const SizedBox(height: 16),

          // Bouton principal de confirmation & planification avec dégradé logo
          Container(
            width: double.infinity,
            height: 48,
            decoration: BoxDecoration(
              gradient: _selectedTripDestination.trim().isNotEmpty
                  ? const LinearGradient(
                      colors: [Color(0xFF1A3A6B), Color(0xFF22A832)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              color: _selectedTripDestination.trim().isNotEmpty ? null : const Color(0xFF94A3B8),
              borderRadius: BorderRadius.circular(14),
              boxShadow: _selectedTripDestination.trim().isNotEmpty
                  ? [
                      BoxShadow(
                        color: const Color(0xFF22A832).withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ]
                  : null,
            ),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                foregroundColor: Colors.white,
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

  // --- COMPOSANT : RECHERCHES RÉCENTES ---
  Widget _buildRecentSearchesSection(CityFlowProvider provider) {
    final history = provider.tripHistory.take(6).toList();
    if (history.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.history_rounded, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 4),
              const Text(
                'Trajets récents :',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
              ),
              const Spacer(),
              InkWell(
                onTap: () => provider.clearTripHistory(),
                child: const Text('Effacer', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
              ),
            ],
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: history.map((item) {
                final parts = item.title.split(' → ');
                final orig = parts.isNotEmpty ? parts[0].trim() : _selectedTripOrigin;
                final dest = parts.length > 1 ? parts[1].trim() : item.title.trim();
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _selectedTripOrigin = orig;
                        _selectedTripDestination = dest;
                      });
                      _destinationFieldController?.text = dest;
                      _runTripPrediction();
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.turn_right_rounded, size: 12, color: Color(0xFF10B981)),
                          const SizedBox(width: 4),
                          Text(
                            dest,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.navy),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // --- COMPOSANT : SÉLECTEUR VITESSE VS CONFORT ---
  Widget _buildRouteModeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Préférence d\'itinéraire :',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () {
                  setState(() => _routeMode = 'comfort');
                  if (_selectedTripDestination.trim().isNotEmpty) {
                    _runTripPrediction();
                  }
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                  decoration: BoxDecoration(
                    gradient: _routeMode == 'comfort'
                        ? const LinearGradient(
                            colors: [Color(0xFF1A3A6B), Color(0xFF22A832)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    color: _routeMode == 'comfort' ? null : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _routeMode == 'comfort' ? Colors.transparent : const Color(0xFFCBD5E1),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('🛣️', style: TextStyle(fontSize: 13)),
                      const SizedBox(width: 6),
                      Text(
                        'Confort (Bitumé)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _routeMode == 'comfort' ? Colors.white : const Color(0xFF334155),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: InkWell(
                onTap: () {
                  setState(() => _routeMode = 'speed');
                  if (_selectedTripDestination.trim().isNotEmpty) {
                    _runTripPrediction();
                  }
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                  decoration: BoxDecoration(
                    gradient: _routeMode == 'speed'
                        ? const LinearGradient(
                            colors: [Color(0xFF1A3A6B), Color(0xFF22A832)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    color: _routeMode == 'speed' ? null : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _routeMode == 'speed' ? Colors.transparent : const Color(0xFFCBD5E1),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('⚡', style: TextStyle(fontSize: 13)),
                      const SizedBox(width: 6),
                      Text(
                        'Vitesse (Rapide)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _routeMode == 'speed' ? Colors.white : const Color(0xFF334155),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
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

  Widget _buildCorridorWaypointsSection(List<dynamic> waypoints, Map<String, dynamic>? bottleneck) {
    if (waypoints.isEmpty) return const SizedBox.shrink();

    final bestRoute = _tripPredictionResult?['bestRouteOverview'] as Map<String, dynamic>?;

    return Container(
      margin: const EdgeInsets.only(top: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.alt_route_rounded, color: Color(0xFF0284C7), size: 16),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Diagnostic étape par étape & Meilleur itinéraire',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: AppColors.navy),
                    ),
                    Text(
                      'Heures de passage exactes & qualité de la chaussée',
                      style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Synthèse Meilleure Route Bitumée Recommandée
          if (bestRoute != null)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '🛣️ ${bestRoute['recommendedRouteName'] ?? 'Itinéraire Prioritaire Bitumé'}',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF15803D)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${bestRoute['averageRoadQualityScore'] ?? 95}% Bitume',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF166534)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '✨ ${bestRoute['whyBestRoute'] ?? 'Privilégie les boulevards bitumés.'}',
                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF166534), fontWeight: FontWeight.w600),
                  ),
                  if (bestRoute['alternativeDegradedRoute'] != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      '⚠️ ${bestRoute['alternativeDegradedRoute']['name']}: ${bestRoute['alternativeDegradedRoute']['warning']}',
                      style: const TextStyle(fontSize: 10, color: Color(0xFFB45309), fontWeight: FontWeight.w600),
                    ),
                  ],
                ],
              ),
            ),

          // Point critique identifié
          if (bottleneck != null && (bottleneck['congestionScore'] as num? ?? 0) >= 65)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('🚨', style: TextStyle(fontSize: 16)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF991B1B)),
                        children: [
                          const TextSpan(text: 'Point critique du parcours : ', style: TextStyle(fontWeight: FontWeight.w900)),
                          TextSpan(
                            text: '${bottleneck['nodeName']} ',
                            style: const TextStyle(fontWeight: FontWeight.w900, decoration: TextDecoration.underline),
                          ),
                          TextSpan(text: 'atteint vers ${bottleneck['etaFormatted']} (${bottleneck['mainReason']}).'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Liste verticale des étapes & carrefours
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: waypoints.length,
            separatorBuilder: (context, index) => Container(
              margin: const EdgeInsets.only(left: 16),
              height: 14,
              child: const VerticalDivider(color: Color(0xFFCBD5E1), thickness: 1.5, width: 2),
            ),
            itemBuilder: (context, index) {
              final wp = waypoints[index] as Map<String, dynamic>;
              final isOrigin = wp['isOrigin'] == true;
              final isDest = wp['isDestination'] == true;
              final score = wp['congestionScore'] as num? ?? 50;
              final obstacles = (wp['obstacles'] as List<dynamic>?) ?? [];
              final statusLabel = wp['statusLabel'] ?? 'Fluide';
              final eta = wp['estimatedArrival'] ?? '';
              final delayAtNode = wp['delayAtNodeMin'] as num? ?? 0;
              final roadName = wp['roadName'] as String?;
              final pavementStatus = wp['pavementStatus'] as String?;

              Color badgeColor = const Color(0xFF10B981);
              if (score >= 85 || obstacles.any((o) => (o as Map)['severity'] == 'critical')) {
                badgeColor = const Color(0xFFDC2626);
              } else if (score >= 68) {
                badgeColor = const Color(0xFFEA580C);
              } else if (score >= 40) {
                badgeColor = const Color(0xFFF59E0B);
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isOrigin
                              ? const Color(0xFF0284C7)
                              : (isDest ? const Color(0xFF10B981) : badgeColor.withValues(alpha: 0.15)),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isOrigin
                                ? const Color(0xFF0284C7)
                                : (isDest ? const Color(0xFF10B981) : badgeColor),
                            width: 1.5,
                          ),
                        ),
                        child: Icon(
                          isOrigin
                              ? Icons.trip_origin_rounded
                              : (isDest ? Icons.location_on_rounded : Icons.alt_route_rounded),
                          size: 15,
                          color: (isOrigin || isDest) ? Colors.white : badgeColor,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    wp['name'] ?? '',
                                    style: TextStyle(
                                      fontWeight: isOrigin || isDest ? FontWeight.w900 : FontWeight.w800,
                                      fontSize: 12.5,
                                      color: AppColors.navy,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0284C7).withValues(alpha: 0.10),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.access_time_filled_rounded, size: 10, color: Color(0xFF0284C7)),
                                      const SizedBox(width: 3),
                                      Text(
                                        eta,
                                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF0284C7)),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (roadName != null && roadName.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 4,
                                runSpacing: 2,
                                children: [
                                  Text(
                                    '🛣️ $roadName',
                                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF0284C7)),
                                  ),
                                  if (pavementStatus != null)
                                    Text(
                                      '• $pavementStatus',
                                      style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                    ),
                                ],
                              ),
                            ],
                            const SizedBox(height: 2),
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 5,
                              runSpacing: 2,
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(color: badgeColor, shape: BoxShape.circle),
                                ),
                                Text(
                                  '$statusLabel ($score%)',
                                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: badgeColor),
                                ),
                                if (delayAtNode > 0)
                                  Text(
                                    '(+${delayAtNode}m retard)',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Obstacles détectés sur ce carrefour spécifique
                  if (obstacles.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(left: 42, top: 6, bottom: 4),
                      child: Column(
                        children: obstacles.map((obsMap) {
                          final obs = obsMap as Map<String, dynamic>;
                          final isCritical = obs['severity'] == 'critical';
                          return Container(
                            margin: const EdgeInsets.only(bottom: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                            decoration: BoxDecoration(
                              color: isCritical ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isCritical ? const Color(0xFFFECACA) : const Color(0xFFFDE68A),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(obs['icon'] ?? '⚠️', style: const TextStyle(fontSize: 13)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        obs['title'] ?? '',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: isCritical ? const Color(0xFF991B1B) : const Color(0xFF92400E),
                                        ),
                                      ),
                                      if ((obs['description'] as String?)?.isNotEmpty == true)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 1),
                                          child: Text(
                                            obs['description'] ?? '',
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: isCritical ? const Color(0xFF7F1D1D) : const Color(0xFF78350F),
                                            ),
                                          ),
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
                ],
              );
            },
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
                            colors: [Color(0xFF1A3A6B), Color(0xFF22A832)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF22A832).withValues(alpha: 0.25),
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
