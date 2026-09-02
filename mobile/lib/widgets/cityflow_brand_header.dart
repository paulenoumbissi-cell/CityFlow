import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class CityFlowBrandHeader extends StatelessWidget {
  final double logoSize;
  final bool showSlogan;

  const CityFlowBrandHeader({
    super.key,
    this.logoSize = 36,
    this.showSlogan = true,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.asset(
            'assets/images/logo.png',
            width: logoSize,
            height: logoSize,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                width: logoSize,
                height: logoSize,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.traffic_rounded, color: AppColors.primary),
              );
            },
          ),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            RichText(
              text: const TextSpan(
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
                children: [
                  TextSpan(
                    text: 'City',
                    style: TextStyle(color: AppColors.navy),
                  ),
                  TextSpan(
                    text: 'Flow',
                    style: TextStyle(color: AppColors.primary),
                  ),
                ],
              ),
            ),
            if (showSlogan)
              const Text(
                'Circuler mieux, vivre mieux',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
          ],
        ),
      ],
    );
  }
}
