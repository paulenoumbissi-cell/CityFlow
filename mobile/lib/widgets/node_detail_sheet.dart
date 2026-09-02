import 'package:flutter/material.dart';
import '../models/traffic_node.dart';
import '../core/constants/app_colors.dart';

class NodeDetailSheet extends StatelessWidget {
  final TrafficNode node;
  final VoidCallback onClose;
  final VoidCallback onAvoidRoute;

  const NodeDetailSheet({
    super.key,
    required this.node,
    required this.onClose,
    required this.onAvoidRoute,
  });

  Color _getCongestionColor(CongestionLevel level) {
    switch (level) {
      case CongestionLevel.fluid:
        return AppColors.trafficFluid;
      case CongestionLevel.moderate:
        return AppColors.trafficModerate;
      case CongestionLevel.heavy:
        return AppColors.trafficHeavy;
      case CongestionLevel.jammed:
        return AppColors.trafficJam;
    }
  }

  String _getCongestionLabel(CongestionLevel level) {
    switch (level) {
      case CongestionLevel.fluid:
        return 'Trafic Fluide';
      case CongestionLevel.moderate:
        return 'Trafic Ralenti';
      case CongestionLevel.heavy:
        return 'Fort Bouchon';
      case CongestionLevel.jammed:
        return 'Nœud Saturé';
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getCongestionColor(node.currentCongestion);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppColors.cardBorder, width: 1.5)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: statusColor),
                          ),
                          child: Text(
                            _getCongestionLabel(node.currentCongestion),
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          node.city,
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      node.name,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                onPressed: onClose,
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Live Metrics
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  title: 'Vitesse moyenne',
                  value: '${node.averageSpeedKmh} km/h',
                  icon: Icons.speed_rounded,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMetricTile(
                  title: 'Retard estimé',
                  value: '+${node.estimatedDelayMinutes} min',
                  icon: Icons.timer_outlined,
                  color: AppColors.trafficHeavy,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMetricTile(
                  title: 'Flux véhicules',
                  value: '${node.vehicleCountPerHour}/h',
                  icon: Icons.directions_car_filled_rounded,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // AI Predictions preview
          const Row(
            children: [
              Icon(Icons.auto_awesome_rounded, color: AppColors.accent, size: 16),
              SizedBox(width: 6),
              Text(
                'Prédictions IA du trafic (Heures à venir)',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: node.predictions.map((p) => _buildPredictionChip(p)).toList(),
            ),
          ),
          const SizedBox(height: 20),
          // Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onAvoidRoute,
                  icon: const Icon(Icons.alt_route_rounded, size: 18),
                  label: const Text('Calculer Itinéraire Évitement'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 13, color: color),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPredictionChip(TrafficPrediction prediction) {
    final isHigh = prediction.congestionPercentage > 70;
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isHigh ? AppColors.trafficHeavy.withValues(alpha: 0.5) : AppColors.cardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            prediction.label,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isHigh ? AppColors.trafficHeavy : AppColors.trafficFluid,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '${prediction.congestionPercentage.toInt()}%',
                style: TextStyle(
                  color: isHigh ? AppColors.trafficHeavy : AppColors.trafficFluid,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            prediction.weatherInfluence,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 9),
          ),
        ],
      ),
    );
  }
}
