import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../providers/city_flow_provider.dart';
import '../models/traffic_node.dart';
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
  TrafficNode? _selectedNode;
  String _selectedWeather = 'dry';
  Map<String, dynamic>? _aiForecastData;
  bool _isLoadingAi = false;

  final List<Map<String, dynamic>> _weatherOptions = [
    {'key': 'dry', 'label': 'Beau temps', 'icon': Icons.wb_sunny_rounded, 'color': AppColors.trafficModerate},
    {'key': 'light_rain', 'label': 'Bruine', 'icon': Icons.grain_rounded, 'color': Colors.blue},
    {'key': 'heavy_rain', 'label': 'Pluie forte', 'icon': Icons.thunderstorm_rounded, 'color': Colors.indigo},
    {'key': 'flood', 'label': 'Inondation', 'icon': Icons.waves_rounded, 'color': AppColors.emergency},
  ];

  @override
  void initState() {
    super.initState();
    _loadAiForecast();
  }

  Future<void> _loadAiForecast() async {
    final provider = context.read<CityFlowProvider>();
    setState(() => _isLoadingAi = true);

    final data = await CityFlowMobileApiService.fetchAiForecast(
      city: provider.selectedCity,
      weather: _selectedWeather,
    );

    if (mounted) {
      setState(() {
        _aiForecastData = data;
        _isLoadingAi = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityFlowProvider>();
    final nodes = provider.currentNodes;
    final activeNode = _selectedNode ?? (nodes.isNotEmpty ? nodes.first : null);

    final List globalForecast = _aiForecastData?['globalForecast'] ?? [
      {'horizon': '+15 min', 'congestionPercentage': 45},
      {'horizon': '+30 min', 'congestionPercentage': 62},
      {'horizon': '+1 heure', 'congestionPercentage': 82},
      {'horizon': '+2 heures', 'congestionPercentage': 68},
      {'horizon': '+3 heures', 'congestionPercentage': 35},
    ];

    final List recommendations = _aiForecastData?['recommendations'] ?? [];
    final List anomalies = _aiForecastData?['anomalies'] ?? [];

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
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Retour à la carte',
            onPressed: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              } else {
                widget.onNavigateTab?.call(0);
              }
            },
          ),
          title: const Text('Prédiction & IA Trafic'),
          actions: const [
            Padding(
              padding: EdgeInsets.only(right: 12),
              child: CitySelector(),
            ),
          ],
        ),
        body: activeNode == null
            ? const Center(child: Text('Aucune donnée disponible'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // 1. BANNIÈRE MOTEUR IA
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Moteur Prédictif Neural CityFlow',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _aiForecastData?['aiModel'] ?? 'Modèle v2.4 (Apprentissage profond)',
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      if (_isLoadingAi)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                // 2. SIMULATEUR DE SCÉNARIOS MÉTÉO
                const Text(
                  'Simulateur d\'Impact Météo en Direct',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _weatherOptions.map((opt) {
                      final isSelected = _selectedWeather == opt['key'];
                      final Color color = opt['color'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          avatar: Icon(
                            opt['icon'] as IconData,
                            size: 16,
                            color: isSelected ? Colors.white : color,
                          ),
                          label: Text(opt['label'] as String),
                          selected: isSelected,
                          selectedColor: AppColors.primary,
                          backgroundColor: AppColors.surfaceLight,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppColors.textPrimary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 12,
                          ),
                          onSelected: (val) {
                            if (val) {
                              setState(() => _selectedWeather = opt['key']);
                              _loadAiForecast();
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 18),

                // 3. RECOMMANDATION PROACTIVE DE L'IA
                if (recommendations.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.tips_and_updates_rounded, color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                recommendations[0]['title'] ?? 'Conseil IA',
                                style: const TextStyle(
                                  color: AppColors.primaryDark,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                recommendations[0]['message'] ?? '',
                                style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // 4. SÉLECTEUR DE CARREFOUR
                const Text(
                  'Analyse par Carrefour Stratégique',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: nodes.map((n) {
                      final isSelected = activeNode.id == n.id;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(n.name.split('(').first.trim()),
                          selected: isSelected,
                          selectedColor: AppColors.primary,
                          backgroundColor: AppColors.surfaceLight,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppColors.textPrimary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 12,
                          ),
                          onSelected: (val) {
                            if (val) {
                              setState(() {
                                _selectedNode = n;
                              });
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 20),

                // 5. GRAPHIQUE FL_CHART
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  activeNode.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Indice de saturation prévu (%)',
                                  style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.show_chart_rounded, color: AppColors.primary, size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'Tendance Multi-Horizons',
                                  style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),

                      // FL Chart
                      SizedBox(
                        height: 180,
                        child: LineChart(
                          LineChartData(
                            gridData: FlGridData(
                              show: true,
                              drawVerticalLine: false,
                              horizontalInterval: 25,
                              getDrawingHorizontalLine: (value) {
                                return FlLine(
                                  color: AppColors.cardBorder.withValues(alpha: 0.5),
                                  strokeWidth: 1,
                                );
                              },
                            ),
                            titlesData: FlTitlesData(
                              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              bottomTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  reservedSize: 24,
                                  interval: 1,
                                  getTitlesWidget: (value, meta) {
                                    final index = value.toInt();
                                    if (index >= 0 && index < globalForecast.length) {
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 6),
                                        child: Text(
                                          globalForecast[index]['horizon'] ?? '',
                                          style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      );
                                    }
                                    return const Text('');
                                  },
                                ),
                              ),
                              leftTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  reservedSize: 32,
                                  interval: 25,
                                  getTitlesWidget: (value, meta) {
                                    return Text(
                                      '${value.toInt()}%',
                                      style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                                    );
                                  },
                                ),
                              ),
                            ),
                            borderData: FlBorderData(show: false),
                            minX: 0,
                            maxX: (globalForecast.length - 1).toDouble(),
                            minY: 0,
                            maxY: 100,
                            lineBarsData: [
                              LineChartBarData(
                                spots: globalForecast.asMap().entries.map((entry) {
                                  final num val = entry.value['congestionPercentage'] ?? 50;
                                  return FlSpot(entry.key.toDouble(), val.toDouble());
                                }).toList(),
                                isCurved: true,
                                curveSmoothness: 0.35,
                                color: AppColors.primary,
                                barWidth: 3.5,
                                isStrokeCapRound: true,
                                dotData: FlDotData(
                                  show: true,
                                  getDotPainter: (spot, percent, barData, index) {
                                    return FlDotCirclePainter(
                                      radius: 4.5,
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                      strokeColor: AppColors.primary,
                                    );
                                  },
                                ),
                                belowBarData: BarAreaData(
                                  show: true,
                                  gradient: LinearGradient(
                                    colors: [
                                      AppColors.primary.withValues(alpha: 0.35),
                                      AppColors.primary.withValues(alpha: 0.0),
                                    ],
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // 6. ANOMALIES & SURVEILLANCE
                if (anomalies.isNotEmpty) ...[
                  const Text(
                    'Anomalies Détectées par l\'IA',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ...anomalies.map((ano) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shield_outlined, color: AppColors.primary, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ano['nodeName'] ?? 'Carrefour',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  ano['description'] ?? '',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ],
            ),
      ),
    );
  }
}
