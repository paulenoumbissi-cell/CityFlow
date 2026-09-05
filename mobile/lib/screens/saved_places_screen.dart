import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/saved_place.dart';
import '../core/constants/app_colors.dart';

class SavedPlacesScreen extends StatelessWidget {
  final Function(int)? onNavigateTab;
  const SavedPlacesScreen({super.key, this.onNavigateTab});

  void _showAddPlaceModal(BuildContext context, CityFlowProvider provider) {
    final titleController = TextEditingController();
    final addressController = TextEditingController();
    SavedPlaceCategory selectedCategory = SavedPlaceCategory.custom;
    final landmarks = provider.currentCityLandmarks;
    LatLng selectedPos = landmarks.isNotEmpty ? landmarks.first.pos : provider.currentCityCenter;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Ajouter un Lieu Enregistré',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
                      ),
                      IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Sélecteur de catégorie
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: SavedPlaceCategory.values.map((cat) {
                        final isSelected = selectedCategory == cat;
                        final tempPlace = SavedPlace(
                          id: 'temp',
                          title: '',
                          address: '',
                          category: cat,
                          position: const LatLng(0, 0),
                          city: provider.selectedCity,
                        );
                        return GestureDetector(
                          onTap: () {
                            setModalState(() {
                              selectedCategory = cat;
                              if (titleController.text.isEmpty) {
                                if (cat == SavedPlaceCategory.home) titleController.text = 'Domicile';
                                if (cat == SavedPlaceCategory.work) titleController.text = 'Travail';
                                if (cat == SavedPlaceCategory.school) titleController.text = 'École';
                              }
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? tempPlace.color : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Icon(tempPlace.icon, size: 16, color: isSelected ? Colors.white : AppColors.navy),
                                const SizedBox(width: 6),
                                Text(
                                  tempPlace.categoryLabel,
                                  style: TextStyle(
                                    color: isSelected ? Colors.white : AppColors.navy,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 14),

                  TextField(
                    controller: titleController,
                    decoration: InputDecoration(
                      labelText: 'Nom du lieu',
                      hintText: 'Ex: Domicile, Bureau Akwa, Salle de sport...',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: addressController,
                    decoration: InputDecoration(
                      labelText: 'Adresse ou Quartier',
                      hintText: 'Ex: Rue 1748 Bastos, Yaoundé',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 14),

                  const Text(
                    'Associer à un point de repère de la ville :',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 100,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: ListView.builder(
                      itemCount: landmarks.length,
                      itemBuilder: (ctx, idx) {
                        final l = landmarks[idx];
                        final isSel = selectedPos == l.pos;
                        return ListTile(
                          dense: true,
                          title: Text(l.name, style: TextStyle(fontWeight: isSel ? FontWeight.w900 : FontWeight.w600, fontSize: 12)),
                          subtitle: Text(l.district, style: const TextStyle(fontSize: 10)),
                          trailing: isSel ? const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 18) : null,
                          onTap: () {
                            setModalState(() {
                              selectedPos = l.pos;
                              if (addressController.text.isEmpty) {
                                addressController.text = '${l.name}, ${l.district}';
                              }
                            });
                          },
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF006666),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {
                      final title = titleController.text.trim();
                      final address = addressController.text.trim();
                      if (title.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Veuillez donner un nom à ce lieu')),
                        );
                        return;
                      }

                      provider.addSavedPlace(
                        SavedPlace(
                          id: 'sp_${DateTime.now().millisecondsSinceEpoch}',
                          title: title,
                          address: address.isNotEmpty ? address : '${provider.selectedCity} Centre',
                          category: selectedCategory,
                          position: selectedPos,
                          city: provider.selectedCity,
                        ),
                      );

                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          backgroundColor: AppColors.primary,
                          content: Text('Lieu enregistré avec succès !'),
                        ),
                      );
                    },
                    child: const Text('Enregistrer le lieu', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final savedPlaces = provider.currentCitySavedPlaces;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Lieux Enregistrés',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.white),
        ),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_location_alt_rounded),
            onPressed: () => _showAddPlaceModal(context, provider),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // En-tête explicatif
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(
                    color: Color(0xFFE0F2FE),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.bookmark_added_rounded, color: Color(0xFF0284C7), size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Accès Rapide 1-Clic',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy),
                      ),
                      Text(
                        'Vos adresses favorites pour ${provider.selectedCity}. Lancez la navigation d\'une simple touche.',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (savedPlaces.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  const Icon(Icons.place_outlined, size: 48, color: Color(0xFF94A3B8)),
                  const SizedBox(height: 12),
                  const Text(
                    'Aucun lieu enregistré pour cette ville',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.navy),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Ajoutez votre domicile, travail ou école pour un calcul d\'itinéraire instantané.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF006666),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => _showAddPlaceModal(context, provider),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Ajouter un Favori'),
                  ),
                ],
              ),
            )
          else
            ...savedPlaces.map((place) {
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
                child: Row(
                  children: [
                    // Icône de catégorie colorée
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: place.color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(place.icon, color: place.color, size: 24),
                    ),
                    const SizedBox(width: 14),

                    // Titre et Adresse
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                place.title,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  place.categoryLabel,
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            place.address,
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    // Bouton Naviguer 1-Clic
                    IconButton(
                      icon: const Icon(Icons.directions_rounded, color: Color(0xFF006666), size: 24),
                      onPressed: () {
                        provider.fetchSmartRoutes(
                          origin: provider.userRealPosition ?? provider.currentCityCenter,
                          destination: place.position,
                        );
                        provider.addToTripHistory(
                          title: place.title,
                          subtitle: place.address,
                          destinationPos: place.position,
                          category: 'favorite',
                        );
                        Navigator.pop(context);
                        onNavigateTab?.call(1);
                      },
                    ),

                    // Supprimer
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 18),
                      onPressed: () => provider.removeSavedPlace(place.id),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF006666),
        foregroundColor: Colors.white,
        onPressed: () => _showAddPlaceModal(context, provider),
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('Nouveau Lieu', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}
