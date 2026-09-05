import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../core/constants/app_colors.dart';

class TripHistoryScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const TripHistoryScreen({super.key, this.onNavigateTab});

  @override
  State<TripHistoryScreen> createState() => _TripHistoryScreenState();
}

class _TripHistoryScreenState extends State<TripHistoryScreen> {
  String _filterQuery = '';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final history = provider.tripHistory.where((item) {
      if (_filterQuery.isEmpty) return true;
      return item.title.toLowerCase().contains(_filterQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().contains(_filterQuery.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Historique des Trajets',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.white),
        ),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (provider.tripHistory.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_rounded),
              tooltip: 'Effacer l\'historique',
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Effacer l\'historique ?', style: TextStyle(fontWeight: FontWeight.bold)),
                    content: const Text('Cette action supprimera toutes vos recherches et trajets récents enregistrés sur l\'appareil.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                        onPressed: () {
                          provider.clearTripHistory();
                          Navigator.pop(ctx);
                        },
                        child: const Text('Effacer', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
      body: Column(
        children: [
          // Barre de recherche dans l'historique
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Filtrer l\'historique...',
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF006666)),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.cardBorder),
                ),
              ),
              onChanged: (val) => setState(() => _filterQuery = val),
            ),
          ),

          Expanded(
            child: history.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.history_rounded, size: 48, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text(
                          'Aucun historique disponible',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.navy),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Vos recherches et navigations s\'afficheront ici.',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: history.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (ctx, idx) {
                      final item = history[idx];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.cardBorder),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(item.icon, color: const Color(0xFF006666), size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.title,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.navy),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${item.subtitle} • ${item.relativeTimeLabel}',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.directions_rounded, color: Color(0xFF006666)),
                              tooltip: 'Lancer l\'itinéraire',
                              onPressed: () {
                                provider.fetchSmartRoutes(
                                  origin: provider.userRealPosition ?? provider.currentCityCenter,
                                  destination: item.destinationPos,
                                );
                                Navigator.pop(context);
                                widget.onNavigateTab?.call(1);
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textMuted),
                              onPressed: () => provider.removeTripHistoryItem(item.id),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
