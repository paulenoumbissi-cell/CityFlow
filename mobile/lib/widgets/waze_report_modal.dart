import 'dart:async';
import 'package:flutter/material.dart';
import '../models/citizen_report.dart';

// ===================================================================
// MODAL DE SIGNALEMENT COMMUNAUTAIRE WAZE (12 CATÉGORIES)
// ===================================================================

class WazeReportGridModal extends StatefulWidget {
  final String selectedCity;
  final Function(CitizenReportCategory, CitizenReportSeverity, String, String) onReportSubmitted;

  const WazeReportGridModal({
    super.key,
    required this.selectedCity,
    required this.onReportSubmitted,
  });

  @override
  State<WazeReportGridModal> createState() => _WazeReportGridModalState();
}

class _WazeReportGridModalState extends State<WazeReportGridModal> {
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
      'cat': CitizenReportCategory.trafficLight,
      'label': 'Feu en panne',
      'icon': Icons.traffic_outlined,
      'color': const Color(0xFFE11D48),
      'subtypes': ['Feu éteint', 'Clignote orange', 'Bloqué au rouge'],
    },
    {
      'cat': CitizenReportCategory.motoRush,
      'label': 'Motos / Blocage',
      'icon': Icons.two_wheeler_rounded,
      'color': const Color(0xFFF97316),
      'subtypes': ['Concentration massive', 'Carrefour encombré', 'Sens interdit motos'],
    },
    {
      'cat': CitizenReportCategory.police,
      'label': 'Police & Contrôle',
      'icon': Icons.local_police_rounded,
      'color': const Color(0xFF2563EB),
      'subtypes': ['Contrôle visible', 'Radar / Jumelles', 'Régulation manuelle'],
    },
    {
      'cat': CitizenReportCategory.accident,
      'label': 'Accident',
      'icon': Icons.car_crash_rounded,
      'color': const Color(0xFFEF4444),
      'subtypes': ['Accident léger', 'Voie bloquée', 'Collision moto / taxi'],
    },
    {
      'cat': CitizenReportCategory.funeral,
      'label': 'Deuil / Bâche',
      'icon': Icons.night_shelter_rounded,
      'color': const Color(0xFF7C3AED),
      'subtypes': ['Bâche sur chaussée', 'Veillée / Cérémonie', 'Voie rétrécie'],
    },
    {
      'cat': CitizenReportCategory.truckBreakdown,
      'label': 'Camion / Grumier',
      'icon': Icons.local_shipping_rounded,
      'color': const Color(0xFFD97706),
      'subtypes': ['Grumier en panne', 'Conteneur renversé', 'Camion en travers'],
    },
    {
      'cat': CitizenReportCategory.hazard,
      'label': 'Danger / Trou',
      'icon': Icons.warning_amber_rounded,
      'color': const Color(0xFFF59E0B),
      'subtypes': ['Nid-de-poule profond', 'Caniveau ouvert', 'Obstacle chaussée'],
    },
    {
      'cat': CitizenReportCategory.roadworks,
      'label': 'Travaux voirie',
      'icon': Icons.construction_rounded,
      'color': const Color(0xFFEA580C),
      'subtypes': ['Chantier bitumage', 'Voie déviée', 'Engins sur voie'],
    },
    {
      'cat': CitizenReportCategory.closure,
      'label': 'Route barrée',
      'icon': Icons.block_rounded,
      'color': const Color(0xFFDC2626),
      'subtypes': ['Inaccessible', 'Déviation obligatoire', 'Manifestation'],
    },
    {
      'cat': CitizenReportCategory.flooding,
      'label': 'Inondation',
      'icon': Icons.water_drop_rounded,
      'color': const Color(0xFF0284C7),
      'subtypes': ['Bas-fond inondé', 'Flaque géante', 'Caniveau débordé'],
    },
    {
      'cat': CitizenReportCategory.gasStation,
      'label': 'Carburant',
      'icon': Icons.local_gas_station_rounded,
      'color': const Color(0xFF10B981),
      'subtypes': ['Disponible sans attente', 'Rupture essence', 'Rupture gasoil'],
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
        if (mounted) {
          setState(() {
            _autoSendSeconds--;
          });
        }
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
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: _selectedCategory == null ? _buildWazeGrid() : _buildWazeSubtypeDetails(),
        ),
      ),
    );
  }

  // ÉCRAN 1 : LA GRILLE DES 12 ICÔNES WAZE
  Widget _buildWazeGrid() {
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 14),
          const Text(
            'Que voyez-vous sur votre axe ?',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            'Touchez un bouton pour avertir la communauté (+25 pts)',
            style: TextStyle(color: Colors.white60, fontSize: 12),
          ),
          const SizedBox(height: 18),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 14,
              crossAxisSpacing: 12,
              childAspectRatio: 0.95,
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
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: color.withValues(alpha: 0.45),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(icon, color: Colors.white, size: 28),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      label,
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // ÉCRAN 2 : SOUS-TYPE & COMPTE À REBOURS WAZE
  Widget _buildWazeSubtypeDetails() {
    final currentItem = _wazeGridItems.firstWhere((i) => i['cat'] == _selectedCategory);
    final subtypes = currentItem['subtypes'] as List<String>;
    final color = currentItem['color'] as Color;
    final isYde = widget.selectedCity.toLowerCase().contains('yaound');

    final landmarks = isYde
        ? ['Carrefour CRADAT', 'Carrefour Nlongkak', 'Marché Mokolo', 'Poste Centrale', 'Carrefour Bastos', 'Carrefour Nsam']
        : ['Rond-point Ndokoti', 'Carrefour Deido', 'Boulevard Akwa', 'Rond-point Bonanjo', 'Carrefour Ange Raphaël'];

    return SingleChildScrollView(
      child: Column(
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
                style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white70),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Précisez la situation :',
            style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
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
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSel ? color : const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSel ? Colors.white : Colors.white24),
                  ),
                  child: Text(
                    sub,
                    style: TextStyle(
                      color: isSel ? Colors.white : Colors.white70,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),
          const Text(
            'Repère carrefour le plus proche :',
            style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: landmarks.map((lm) {
                final isSel = _locationController.text == lm;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ActionChip(
                    label: Text(lm),
                    backgroundColor: isSel ? color : const Color(0xFF1E293B),
                    labelStyle: TextStyle(
                      color: isSel ? Colors.white : Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                    onPressed: () {
                      setState(() => _locationController.text = lm);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),
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
          const SizedBox(height: 16),
          // Bouton d'envoi Waze avec Compte à rebours
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 4,
            ),
            onPressed: _submitReport,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'ENVOYER ($_autoSendSeconds s)',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.send_rounded, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
