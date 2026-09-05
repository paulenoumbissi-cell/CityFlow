import 'dart:async';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/scheduled_trip.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/city_data.dart';
import '../core/services/api_service.dart';

class TripPlannerScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const TripPlannerScreen({super.key, this.onNavigateTab});

  @override
  State<TripPlannerScreen> createState() => _TripPlannerScreenState();
}

class _TripPlannerScreenState extends State<TripPlannerScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _originController = TextEditingController();
  final TextEditingController _destinationController = TextEditingController();

  LatLng? _selectedOriginPos;
  LatLng? _selectedDestPos;

  TimeOfDay _targetTime = const TimeOfDay(hour: 8, minute: 30);
  DateTime _targetDate = DateTime.now();

  ScheduledTrip? _lastCalculatedTrip;
  bool _isCalculating = false;

  @override
  void initState() {
    super.initState();
    final provider = context.read<CityFlowProvider>();
    _originController.text = 'Ma position actuelle';
    _selectedOriginPos = provider.userRealPosition ?? provider.currentCityCenter;

    final landmarks = provider.currentCityLandmarks;
    if (landmarks.isNotEmpty) {
      _destinationController.text = landmarks.first.name;
      _selectedDestPos = landmarks.first.pos;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _originController.dispose();
    _destinationController.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _targetTime,
      helpText: 'HEURE D\'ARRIVÉE SOUHAITÉE',
      cancelText: 'ANNULER',
      confirmText: 'CONFIRMER',
    );
    if (picked != null) {
      setState(() {
        _targetTime = picked;
      });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _targetDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      helpText: 'DATE DU TRAJET',
    );
    if (picked != null) {
      setState(() {
        _targetDate = picked;
      });
    }
  }

  void _calculateDeparture() {
    if (_destinationController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez indiquer une destination')),
      );
      return;
    }

    setState(() => _isCalculating = true);

    final provider = context.read<CityFlowProvider>();
    final originPos = _selectedOriginPos ?? provider.userRealPosition ?? provider.currentCityCenter;
    final destPos = _selectedDestPos ?? (provider.selectedCity == 'Yaoundé' ? const LatLng(3.8666, 11.5167) : const LatLng(4.0511, 9.7679));

    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      final trip = provider.planTripWithAi(
        title: _titleController.text.trim(),
        originName: _originController.text.trim().isNotEmpty ? _originController.text.trim() : 'Départ',
        originPos: originPos,
        destinationName: _destinationController.text.trim(),
        destinationPos: destPos,
        targetArrivalTime: _targetTime,
        date: _targetDate,
      );

      setState(() {
        _lastCalculatedTrip = trip;
        _isCalculating = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primary,
          content: Text('Départ conseillé à ${trip.formattedDepartureTime} pour arriver à ${trip.formattedArrivalTime} !'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }

  void _openPlaceSelector({required bool isOrigin}) {
    final provider = context.read<CityFlowProvider>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return _TripPlannerPlaceModal(
          isOrigin: isOrigin,
          city: provider.selectedCity,
          userPos: provider.userRealPosition,
          savedPlaces: provider.currentCitySavedPlaces,
          landmarks: provider.currentCityLandmarks,
          onSelectPosition: (name, pos) {
            setState(() {
              if (isOrigin) {
                _originController.text = name;
                _selectedOriginPos = pos;
              } else {
                _destinationController.text = name;
                _selectedDestPos = pos;
              }
            });
            Navigator.pop(ctx);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final scheduledTrips = provider.currentCityScheduledTrips;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Planificateur IA de Départ',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.white),
        ),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Comment fonctionne l\'IA de départ ?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  content: const Text(
                    'CityFlow analyse les tendances horaires de congestion, les goulots d\'étranglement récurrents (ex: Carrefour Nlongkak, Rond-point Deido) et applique une marge de sécurité adaptative pour garantir votre ponctualité.',
                    style: TextStyle(fontSize: 13, height: 1.4),
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Compris')),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ==========================================
          // 1. BANNIÈRE PROACTIVE IA
          // ==========================================
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF064E3B), Color(0xFF00875A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF00875A).withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
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
                  child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Soyez à l\'heure à coup sûr',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Indiquez quand vous devez arriver. L\'IA CityFlow déduit les bouchons et vous dit quand démarrer.',
                        style: TextStyle(
                          color: Color(0xFFE2E8F0),
                          fontSize: 12,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ==========================================
          // 2. FORMULAIRE DE PLANIFICATION
          // ==========================================
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Détails du Trajet',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
                ),
                const SizedBox(height: 14),

                // Titre optionnel
                TextField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    labelText: 'Nom du rendez-vous (Optionnel)',
                    hintText: 'Ex: Réunion DG, Examen, Vol départ...',
                    prefixIcon: const Icon(Icons.label_outline_rounded, color: AppColors.primary),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),

                // Départ
                InkWell(
                  onTap: () => _openPlaceSelector(isOrigin: true),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.trip_origin_rounded, color: Color(0xFF00875A), size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Point de départ', style: TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                              Text(
                                _originController.text.isNotEmpty ? _originController.text : 'Choisir le départ',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.navy),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_drop_down_rounded, color: AppColors.textSecondary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Destination
                InkWell(
                  onTap: () => _openPlaceSelector(isOrigin: false),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on_rounded, color: Color(0xFFEA580C), size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Destination', style: TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                              Text(
                                _destinationController.text.isNotEmpty ? _destinationController.text : 'Choisir la destination',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.navy),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_drop_down_rounded, color: AppColors.textSecondary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Sélecteurs Date & Heure
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: _pickDate,
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.navy),
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Date', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                  Text(
                                    '${_targetDate.day}/${_targetDate.month}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        onTap: _pickTime,
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.access_time_rounded, size: 18, color: Color(0xFF006666)),
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Arrivée à', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                  Text(
                                    '${_targetTime.hour.toString().padLeft(2, '0')}:${_targetTime.minute.toString().padLeft(2, '0')}',
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF006666)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Bouton Calculer
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF006666),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 3,
                  ),
                  onPressed: _isCalculating ? null : _calculateDeparture,
                  icon: _isCalculating
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.auto_awesome_rounded, size: 20),
                  label: Text(
                    _isCalculating ? 'Analyse du trafic...' : 'Calculer l\'Heure de Départ Idéale',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ==========================================
          // 3. RÉSULTAT DU CALCUL IA
          // ==========================================
          if (_lastCalculatedTrip != null) ...[
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFF0A2540),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF10B981), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withValues(alpha: 0.2),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 14),
                            SizedBox(width: 4),
                            Text('Recommandation IA Validée', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 11)),
                          ],
                        ),
                      ),
                      Text(
                        _lastCalculatedTrip!.title,
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('PARTEZ À', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                            Text(
                              _lastCalculatedTrip!.formattedDepartureTime,
                              style: const TextStyle(color: Color(0xFF10B981), fontSize: 32, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 40, color: Colors.white24),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('ARRIVÉE CIBLE', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                            Text(
                              _lastCalculatedTrip!.formattedArrivalTime,
                              style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_rounded, color: Color(0xFF38BDF8), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _lastCalculatedTrip!.aiReasoning,
                            style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Color(0xFF10B981)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () {
                            provider.toggleScheduledTripReminder(_lastCalculatedTrip!.id);
                            setState(() {});
                          },
                          icon: Icon(
                            _lastCalculatedTrip!.isReminderActive ? Icons.notifications_active_rounded : Icons.notifications_off_rounded,
                            color: const Color(0xFF10B981),
                            size: 18,
                          ),
                          label: Text(_lastCalculatedTrip!.isReminderActive ? 'Rappel Actif' : 'Activer Rappel'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00875A),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () {
                            provider.fetchSmartRoutes(
                              origin: _lastCalculatedTrip!.originPos,
                              destination: _lastCalculatedTrip!.destinationPos,
                            );
                            Navigator.pop(context);
                            widget.onNavigateTab?.call(1);
                          },
                          icon: const Icon(Icons.navigation_rounded, size: 18),
                          label: const Text('Naviguer', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // ==========================================
          // 4. LISTE DES TRAJETS PLANIFIÉS
          // ==========================================
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Trajets Planifiés (${scheduledTrips.length})',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
              ),
              if (scheduledTrips.isNotEmpty)
                const Text('Heure locale', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            ],
          ),
          const SizedBox(height: 10),

          if (scheduledTrips.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: const Column(
                children: [
                  Icon(Icons.event_available_rounded, size: 40, color: Color(0xFF94A3B8)),
                  SizedBox(height: 8),
                  Text(
                    'Aucun départ planifié',
                    style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.navy),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Utilisez le formulaire ci-dessus pour planifier vos déplacements et éviter les bouchons.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            )
          else
            ...scheduledTrips.map((trip) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.cardBorder),
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
                          child: Text(
                            trip.title,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFEF4444)),
                          onPressed: () => provider.removeScheduledTrip(trip.id),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        const Icon(Icons.trip_origin_rounded, size: 14, color: Color(0xFF00875A)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text('${trip.originName} → ${trip.destinationName}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                              maxLines: 1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Départ : ${trip.formattedDepartureTime} (Arrivée ${trip.formattedArrivalTime})',
                            style: const TextStyle(color: Color(0xFF00875A), fontWeight: FontWeight.w800, fontSize: 11),
                          ),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF006666),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            minimumSize: const Size(0, 32),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () {
                            provider.fetchSmartRoutes(origin: trip.originPos, destination: trip.destinationPos);
                            Navigator.pop(context);
                            widget.onNavigateTab?.call(1);
                          },
                          child: const Text('Partir', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _TripPlannerPlaceModal extends StatefulWidget {
  final bool isOrigin;
  final String city;
  final LatLng? userPos;
  final List<dynamic> savedPlaces;
  final List<CityLandmark> landmarks;
  final Function(String name, LatLng pos) onSelectPosition;

  const _TripPlannerPlaceModal({
    required this.isOrigin,
    required this.city,
    required this.userPos,
    required this.savedPlaces,
    required this.landmarks,
    required this.onSelectPosition,
  });

  @override
  State<_TripPlannerPlaceModal> createState() => _TripPlannerPlaceModalState();
}

class _TripPlannerPlaceModalState extends State<_TripPlannerPlaceModal> {
  String _searchQuery = '';
  late final TextEditingController _searchCtrl;
  Timer? _debounceTimer;
  bool _isSearching = false;
  List<CityLandmark> _searchResults = [];

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController();
    _searchResults = widget.landmarks;
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    setState(() => _searchQuery = query);
    _debounceTimer?.cancel();

    if (query.trim().isEmpty) {
      setState(() {
        _isSearching = false;
        _searchResults = widget.landmarks;
      });
      return;
    }

    final localMatches = widget.landmarks.where((l) {
      final q = query.trim().toLowerCase();
      return l.name.toLowerCase().contains(q) ||
          l.district.toLowerCase().contains(q) ||
          l.desc.toLowerCase().contains(q);
    }).toList();

    setState(() {
      _searchResults = localMatches;
      _isSearching = true;
    });

    _debounceTimer = Timer(const Duration(milliseconds: 320), () async {
      final results = await CityFlowMobileApiService.searchPlaces(
        query: query,
        city: widget.city,
        userPos: widget.userPos,
      );
      if (mounted && _searchQuery == query) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      height: MediaQuery.of(context).size.height * 0.85,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                widget.isOrigin ? 'Choisir le point de départ' : 'Choisir la destination',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  color: AppColors.navy,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _searchCtrl,
            autofocus: true,
            decoration: InputDecoration(
              hintText: 'Rechercher une rue, un quartier, un carrefour...',
              prefixIcon: _isSearching
                  ? const Padding(
                      padding: EdgeInsets.all(12.0),
                      child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                      ),
                    )
                  : const Icon(Icons.search_rounded, color: AppColors.primary),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
                      onPressed: () {
                        _searchCtrl.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
              filled: true,
              fillColor: const Color(0xFFF1F5F9),
              contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
            ),
            onChanged: _onSearchChanged,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              children: [
                if (widget.isOrigin) ...[
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFDCFCE7),
                      child: Icon(Icons.my_location_rounded, color: Color(0xFF16A34A)),
                    ),
                    title: const Text('Ma position GPS actuelle', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                    subtitle: Text(widget.city),
                    onTap: () {
                      final pos = widget.userPos ??
                          (widget.city == 'Yaoundé' ? CityData.yaoundeCenter : CityData.doualaCenter);
                      widget.onSelectPosition('Ma position actuelle', pos);
                    },
                  ),
                  const Divider(),
                ],
                if (_searchQuery.isEmpty && widget.savedPlaces.isNotEmpty) ...[
                  const Text(
                    'Lieux Favoris & Enregistrés',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  ...widget.savedPlaces.map((sp) => ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          backgroundColor: (sp.color as Color).withValues(alpha: 0.15),
                          child: Icon(sp.icon as IconData, color: sp.color as Color, size: 20),
                        ),
                        title: Text(sp.title as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text(sp.address as String, style: const TextStyle(fontSize: 11), maxLines: 1),
                        onTap: () {
                          widget.onSelectPosition(sp.title as String, sp.position as LatLng);
                        },
                      )),
                  const Divider(height: 20),
                ],
                const Text(
                  'Lieux & Carrefours Trouvés',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 6),
                ..._searchResults.map((l) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: const CircleAvatar(
                        backgroundColor: Color(0xFFF1F5F9),
                        child: Icon(Icons.location_on_rounded, color: Color(0xFF006666), size: 18),
                      ),
                      title: Text(l.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      subtitle: Text('${l.district} • ${l.desc}', style: const TextStyle(fontSize: 11), maxLines: 1),
                      onTap: () => widget.onSelectPosition(l.name, l.pos),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

