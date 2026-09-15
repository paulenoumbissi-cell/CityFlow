import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/city_data.dart';
import 'package:intl/intl.dart';

class TripPlannerScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const TripPlannerScreen({super.key, this.onNavigateTab});

  @override
  State<TripPlannerScreen> createState() => _TripPlannerScreenState();
}

class _TripPlannerScreenState extends State<TripPlannerScreen> {
  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final trips = provider.scheduledTrips;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Trajets planifiés', style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.navy),
      ),
      body: trips.isEmpty
          ? _buildEmptyState()
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: trips.length,
              separatorBuilder: (c, i) => const SizedBox(height: 12),
              itemBuilder: (c, i) {
                final trip = trips[i];
                return _buildTripCard(trip, provider);
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openAddTripFlow(context, provider),
        backgroundColor: const Color(0xFF0284C7),
        child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 10))
            ]),
            child: const Icon(Icons.event_note_rounded, size: 64, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 24),
          const Text('Aucun trajet planifié', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.navy)),
          const SizedBox(height: 8),
          const Text(
            'Planifiez un trajet à l\'avance\npour être notifié du meilleur moment pour partir.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildTripCard(dynamic trip, CityFlowProvider provider) {
    final timeStr = trip.formattedArrivalTime;
    final dateStr = DateFormat('dd MMM yyyy').format(trip.scheduledDate);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Arrivée prévue à $timeStr',
                style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0284C7), fontSize: 15),
              ),
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 20),
                onPressed: () => provider.removeScheduledTrip(trip.id),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(dateStr, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600)),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1, color: Color(0xFFE2E8F0)),
          ),
          Row(
            children: [
              const Icon(Icons.my_location_rounded, size: 16, color: Color(0xFF94A3B8)),
              const SizedBox(width: 8),
              Expanded(child: Text(trip.originName, style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.w500))),
            ],
          ),
          const Padding(
            padding: EdgeInsets.only(left: 7),
            child: SizedBox(height: 16, child: VerticalDivider(color: Color(0xFFCBD5E1), thickness: 1.5)),
          ),
          Row(
            children: [
              const Icon(Icons.location_on_rounded, size: 16, color: Color(0xFFEF4444)),
              const SizedBox(width: 8),
              Expanded(child: Text(trip.destinationName, style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.w700))),
            ],
          ),
        ],
      ),
    );
  }

  void _openAddTripFlow(BuildContext context, CityFlowProvider provider) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const _AddTripFlowScreen()),
    );
  }
}

class _AddTripFlowScreen extends StatefulWidget {
  const _AddTripFlowScreen();

  @override
  State<_AddTripFlowScreen> createState() => _AddTripFlowScreenState();
}

class _AddTripFlowScreenState extends State<_AddTripFlowScreen> {
  int _step = 0; // 0 = Destination, 1 = Date/Time
  String _destination = '';
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(_step == 0 ? 'Où allez-vous ?' : 'Heure d\'arrivée', style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.navy),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            if (_step == 1) {
              setState(() => _step = 0);
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: _step == 0 ? _buildDestinationStep() : _buildTimeStep(),
    );
  }

  Widget _buildDestinationStep() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Autocomplete<String>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              final query = textEditingValue.text.trim();
              if (query.isEmpty) return const Iterable<String>.empty();
              final provider = context.read<CityFlowProvider>();
              final places = CityData.searchPlaces(query, provider.selectedCity);
              return places.map((l) => l.name).take(8);
            },
            onSelected: (String selection) {
              setState(() {
                _destination = selection;
                _step = 1; // Passe à l'étape suivante
              });
            },
            fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
              return TextField(
                controller: controller,
                focusNode: focusNode,
                autofocus: true,
                style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.w700, fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Rechercher une destination...',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF0284C7)),
                  filled: true,
                  fillColor: const Color(0xFFF1F5F9),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                ),
              );
            },
            optionsViewBuilder: (context, onSelected, options) {
              return Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 4,
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width - 32, maxHeight: 300),
                    child: ListView.separated(
                      padding: EdgeInsets.zero,
                      itemCount: options.length,
                      separatorBuilder: (c, i) => const Divider(height: 1),
                      itemBuilder: (BuildContext context, int index) {
                        final String option = options.elementAt(index);
                        return ListTile(
                          leading: const Icon(Icons.location_on_rounded, color: Color(0xFF94A3B8)),
                          title: Text(option, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.navy)),
                          onTap: () => onSelected(option),
                        );
                      },
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTimeStep() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Sélectionnez le jour', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildDayBtn('Aujourd\'hui', true)),
              const SizedBox(width: 12),
              Expanded(child: _buildDayBtn('Demain', false)),
            ],
          ),
          const SizedBox(height: 32),
          const Text('Heure d\'arrivée souhaitée', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
          const SizedBox(height: 12),
          InkWell(
            onTap: () async {
              final time = await showTimePicker(context: context, initialTime: _selectedTime);
              if (time != null) setState(() => _selectedTime = time);
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  '${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900, color: AppColors.navy),
                ),
              ),
            ),
          ),
          const Spacer(),
          ElevatedButton(
            onPressed: () {
              final provider = context.read<CityFlowProvider>();
              final originPos = provider.userRealPosition ?? provider.currentCityCenter;
              final destLandmark = CityData.findLandmark(provider.selectedCity, _destination);
              final destPos = destLandmark?.pos ?? originPos; // fallback
              
              provider.planTripWithAi(
                title: 'Trajet vers $_destination',
                originName: provider.isGpsLive ? 'Ma position actuelle' : 'Centre-ville',
                originPos: originPos,
                destinationName: _destination,
                destinationPos: destPos,
                targetTime: _selectedTime,
                date: _selectedDate,
                isDepartureMode: false, // Arrive by
                weather: 'auto',
              );
              
              Navigator.pop(context); // close Add Flow
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text('Enregistrer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildDayBtn(String label, bool isToday) {
    final now = DateTime.now();
    final targetDate = isToday ? now : now.add(const Duration(days: 1));
    final isSelected = _selectedDate.day == targetDate.day;
    
    return InkWell(
      onTap: () {
        setState(() => _selectedDate = targetDate);
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7).withValues(alpha: 0.1) : Colors.transparent,
          border: Border.all(color: isSelected ? const Color(0xFF0284C7) : const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }
}
