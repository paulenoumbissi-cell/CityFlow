import 'package:flutter/material.dart';
import '../models/traffic_node.dart';
import '../core/constants/app_colors.dart';

class PulsingTrafficMarker extends StatefulWidget {
  final TrafficNode node;
  final bool isSelected;
  final VoidCallback onTap;

  const PulsingTrafficMarker({
    super.key,
    required this.node,
    required this.isSelected,
    required this.onTap,
  });

  @override
  State<PulsingTrafficMarker> createState() => _PulsingTrafficMarkerState();
}

class _PulsingTrafficMarkerState extends State<PulsingTrafficMarker>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulseAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.8).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutQuad),
    );

    _opacityAnimation = Tween<double>(begin: 0.65, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutQuad),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getNodeColor(CongestionLevel level) {
    switch (level) {
      case CongestionLevel.jammed:
        return AppColors.trafficJam;
      case CongestionLevel.heavy:
        return AppColors.trafficHeavy;
      case CongestionLevel.moderate:
        return AppColors.trafficModerate;
      case CongestionLevel.fluid:
        return AppColors.trafficFluid;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getNodeColor(widget.node.currentCongestion);
    final isCritical = widget.node.currentCongestion == CongestionLevel.jammed ||
        widget.node.currentCongestion == CongestionLevel.heavy;

    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: 54,
        height: 54,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // ONDE RADAR PULSANTE (Pour les nœuds critiques ou sélectionnés)
            if (isCritical || widget.isSelected)
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color.withValues(alpha: _opacityAnimation.value),
                        border: Border.all(
                          color: color.withValues(alpha: _opacityAnimation.value * 0.8),
                          width: 1.5,
                        ),
                      ),
                    ),
                  );
                },
              ),

            // BADGE CENTRAL DU CARREFOUR
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: widget.isSelected ? 42 : 36,
              height: widget.isSelected ? 42 : 36,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(
                  color: color,
                  width: widget.isSelected ? 3.0 : 2.2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: isCritical ? 0.5 : 0.3),
                    blurRadius: widget.isSelected ? 12 : 8,
                    spreadRadius: isCritical ? 2 : 1,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '🚦',
                      style: TextStyle(
                        fontSize: widget.isSelected ? 10 : 8,
                        height: 1.0,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      '${widget.node.estimatedDelayMinutes}',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: widget.isSelected ? 11 : 9,
                        fontWeight: FontWeight.w900,
                        height: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
