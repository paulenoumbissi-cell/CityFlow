import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/incident_alert.dart';
import '../core/constants/app_colors.dart';
import '../widgets/city_selector.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  AlertSeverity? _selectedSeverity;

  void _showReportIncidentDialog(BuildContext context, CityFlowProvider provider) {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    AlertCategory selectedCat = AlertCategory.accident;
    AlertSeverity selectedSev = AlertSeverity.high;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
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
                        'Nouveau Signalement',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: titleController,
                    decoration: InputDecoration(
                      labelText: 'Titre de l\'incident (ex: Camion en panne)',
                      filled: true,
                      fillColor: AppColors.surfaceLight,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descController,
                    decoration: InputDecoration(
                      labelText: 'Précisions sur le lieu / Axe',
                      filled: true,
                      fillColor: AppColors.surfaceLight,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Catégorie',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: AlertCategory.values.map((cat) {
                      final isSel = selectedCat == cat;
                      return ChoiceChip(
                        avatar: Icon(cat.icon, size: 14, color: isSel ? AppColors.background : AppColors.primary),
                        label: Text(cat.label, style: const TextStyle(fontSize: 11)),
                        selected: isSel,
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.surfaceLight,
                        onSelected: (val) {
                          if (val) setModalState(() => selectedCat = cat);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        if (titleController.text.trim().isEmpty) return;
                        provider.addAlert(
                          title: titleController.text.trim(),
                          locationDescription: descController.text.trim().isEmpty
                              ? 'Signalé par un usager CityFlow'
                              : descController.text.trim(),
                          position: provider.currentCityCenter,
                          severity: selectedSev,
                          category: selectedCat,
                        );
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Signalement diffusé au réseau CityFlow !'),
                            backgroundColor: AppColors.primary,
                          ),
                        );
                      },
                      icon: const Icon(Icons.send_rounded, size: 18),
                      label: const Text('Diffuser l\'alerte'),
                    ),
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
    final alerts = provider.currentCityAlerts.where((a) {
      if (_selectedSeverity == null) return true;
      return a.severity == _selectedSeverity;
    }).toList();

    final timeFormat = DateFormat('HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alertes & Signalements'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: CitySelector(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Severity filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Toutes'),
                  selected: _selectedSeverity == null,
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.surfaceLight,
                  labelStyle: TextStyle(
                    color: _selectedSeverity == null ? AppColors.background : AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                  onSelected: (_) => setState(() => _selectedSeverity = null),
                ),
                const SizedBox(width: 8),
                ...AlertSeverity.values.map((sev) {
                  final isSelected = _selectedSeverity == sev;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(sev.label.split('(').first.trim()),
                      selected: isSelected,
                      selectedColor: sev.color,
                      backgroundColor: AppColors.surfaceLight,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textPrimary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        fontSize: 12,
                      ),
                      onSelected: (val) {
                        setState(() {
                          _selectedSeverity = val ? sev : null;
                        });
                      },
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 16),

          if (alerts.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Column(
                children: [
                  Icon(Icons.check_circle_outline_rounded, color: AppColors.trafficFluid, size: 48),
                  SizedBox(height: 12),
                  Text(
                    'Aucun incident majeur signalé sur ce filtre.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ],
              ),
            )
          else
            ...alerts.map((alert) {
              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: alert.severity == AlertSeverity.critical
                        ? AppColors.emergency.withValues(alpha: 0.5)
                        : AppColors.cardBorder,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: alert.severity.color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(alert.category.icon, color: alert.severity.color, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: alert.severity.color.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      alert.severity.label.split('(').first.trim().toUpperCase(),
                                      style: TextStyle(
                                        color: alert.severity.color,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    alert.city,
                                    style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                  ),
                                  const Spacer(),
                                  Text(
                                    timeFormat.format(alert.reportedAt),
                                    style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                alert.title,
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      alert.locationDescription,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (alert.isVerifiedByAuthority)
                          const Row(
                            children: [
                              Icon(Icons.verified_rounded, color: AppColors.primary, size: 14),
                              SizedBox(width: 4),
                              Text(
                                'Vérifié par la Police / Mairie',
                                style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          )
                        else
                          Text(
                            '${alert.confirmationsCount} confirmation(s)',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                          ),
                        TextButton.icon(
                          onPressed: () => provider.confirmAlert(alert.id),
                          icon: const Icon(Icons.thumb_up_alt_outlined, size: 14),
                          label: const Text('Confirmer'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.background,
        onPressed: () => _showReportIncidentDialog(context, provider),
        icon: const Icon(Icons.add_alert_rounded),
        label: const Text('Signaler un Incident', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
