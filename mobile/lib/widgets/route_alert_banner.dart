import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/route_incident_notification.dart';

// ─────────────────────────────────────────────────────────────────────────────
//  RouteAlertBanner — Banner de notification géo-contextuelle sur trajet
//
//  S'affiche en overlay au-dessus de la carte quand un signalement citoyen
//  est détecté à moins de 200m du trajet actif du conducteur.
//  Se referme automatiquement après 8 secondes ou sur tap utilisateur.
// ─────────────────────────────────────────────────────────────────────────────

class RouteAlertBanner extends StatefulWidget {
  final RouteIncidentNotification alert;
  final VoidCallback onDismiss;
  final VoidCallback? onViewOnMap;

  const RouteAlertBanner({
    super.key,
    required this.alert,
    required this.onDismiss,
    this.onViewOnMap,
  });

  @override
  State<RouteAlertBanner> createState() => _RouteAlertBannerState();
}

class _RouteAlertBannerState extends State<RouteAlertBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<Offset> _slideAnim;
  late Animation<double> _fadeAnim;
  Timer? _autoDismissTimer;

  static const Duration _autoDismissDuration = Duration(seconds: 8);

  // Couleurs de marque
  static const Color _navyDark = Color(0xFF0B1728);
  static const Color _navyMid  = Color(0xFF1A3A6B);
  static const Color _green    = Color(0xFF22A832);
  static const Color _red      = Color(0xFFEF4444);
  static const Color _amber    = Color(0xFFF59E0B);

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );

    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic));

    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animCtrl, curve: const Interval(0, 0.6, curve: Curves.easeOut)),
    );

    _animCtrl.forward();

    // Haptic feedback léger
    HapticFeedback.lightImpact();

    // Auto-dismiss
    _autoDismissTimer = Timer(_autoDismissDuration, () {
      if (mounted) { _dismiss(); }
    });
  }

  @override
  void dispose() {
    _autoDismissTimer?.cancel();
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _dismiss() async {
    _autoDismissTimer?.cancel();
    await _animCtrl.reverse();
    widget.onDismiss();
  }

  Color get _categoryColor {
    switch (widget.alert.category) {
      case 'accident':      return _red;
      case 'trafficJam':
      case 'trafficBlock': return _amber;
      case 'flooding':     return const Color(0xFF0284C7);
      case 'roadworks':    return const Color(0xFFEA580C);
      case 'police':       return const Color(0xFF2563EB);
      case 'closure':      return _red;
      case 'hazard':       return _amber;
      default:             return _navyMid;
    }
  }

  @override
  Widget build(BuildContext context) {
    final alert = widget.alert;
    final catColor = _categoryColor;

    return FadeTransition(
      opacity: _fadeAnim,
      child: SlideTransition(
        position: _slideAnim,
        child: Dismissible(
          key: Key(alert.id),
          direction: DismissDirection.up,
          onDismissed: (_) => widget.onDismiss(),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_navyDark, _navyMid],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: catColor.withValues(alpha: 0.5),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.35),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
                BoxShadow(
                  color: catColor.withValues(alpha: 0.2),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // ── Top accent bar ────────────────────────────────────────
                  Container(
                    height: 3,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [catColor, catColor.withValues(alpha: 0.3)],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                    child: Row(
                      children: [
                        // ── Icône catégorie ───────────────────────────────
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: catColor.withValues(alpha: 0.15),
                            border: Border.all(color: catColor.withValues(alpha: 0.4)),
                          ),
                          child: Center(
                            child: Text(
                              alert.categoryEmoji,
                              style: const TextStyle(fontSize: 22),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // ── Texte ─────────────────────────────────────────
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Badge "SUR VOTRE TRAJET"
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: catColor.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: catColor.withValues(alpha: 0.4)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          width: 5,
                                          height: 5,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: catColor,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'SUR VOTRE TRAJET',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            color: catColor,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    alert.distanceLabel,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: Colors.white54,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              // Titre de l'incident
                              Text(
                                alert.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 14,
                                  color: Colors.white,
                                  height: 1.2,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 3),
                              // Localisation
                              Row(
                                children: [
                                  const Icon(
                                    Icons.location_on_rounded,
                                    size: 11,
                                    color: Colors.white38,
                                  ),
                                  const SizedBox(width: 3),
                                  Flexible(
                                    child: Text(
                                      alert.locationDescription,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Colors.white54,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(width: 8),

                        // ── Actions ───────────────────────────────────────
                        Column(
                          children: [
                            // Fermer
                            GestureDetector(
                              onTap: _dismiss,
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.close_rounded,
                                  size: 14,
                                  color: Colors.white54,
                                ),
                              ),
                            ),
                            if (widget.onViewOnMap != null) ...[
                              const SizedBox(height: 6),
                              // Voir carte
                              GestureDetector(
                                onTap: () {
                                  HapticFeedback.selectionClick();
                                  widget.onViewOnMap!();
                                  _dismiss();
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: _green.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: _green.withValues(alpha: 0.4)),
                                  ),
                                  child: const Icon(
                                    Icons.map_rounded,
                                    size: 14,
                                    color: Color(0xFF34D399),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),

                  // ── Barre de progression auto-dismiss ─────────────────
                  _AutoDismissProgressBar(
                    duration: _autoDismissDuration,
                    color: catColor,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Barre de progression temps d'affichage
// ─────────────────────────────────────────────────────────────────────────────
class _AutoDismissProgressBar extends StatefulWidget {
  final Duration duration;
  final Color color;

  const _AutoDismissProgressBar({required this.duration, required this.color});

  @override
  State<_AutoDismissProgressBar> createState() => _AutoDismissProgressBarState();
}

class _AutoDismissProgressBarState extends State<_AutoDismissProgressBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => ClipRRect(
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(20),
          bottomRight: Radius.circular(20),
        ),
        child: SizedBox(
          height: 3,
          child: LinearProgressIndicator(
            value: 1.0 - _ctrl.value,
            backgroundColor: Colors.white.withValues(alpha: 0.08),
            valueColor: AlwaysStoppedAnimation<Color>(
              widget.color.withValues(alpha: 0.7),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stack wrapper — à utiliser dans la map screen pour afficher le banner
// ─────────────────────────────────────────────────────────────────────────────

/// Empile les alertes de trajet actives au-dessus du contenu.
/// Utilisation :
///   ```dart
///   Stack(
///     children: [
///       MapWidget(...),
///       RouteAlertBannerStack(
///         alerts: provider.routeAlerts,
///         onDismiss: (id) => provider.dismissRouteAlert(id),
///       ),
///     ],
///   )
///   ```
class RouteAlertBannerStack extends StatelessWidget {
  final List<RouteIncidentNotification> alerts;
  final void Function(String alertId) onDismiss;
  final VoidCallback? onViewOnMap;

  const RouteAlertBannerStack({
    super.key,
    required this.alerts,
    required this.onDismiss,
    this.onViewOnMap,
  });

  @override
  Widget build(BuildContext context) {
    if (alerts.isEmpty) return const SizedBox.shrink();

    // N'afficher que la plus récente (la première de la liste)
    final topAlert = alerts.first;

    return Positioned(
      top: MediaQuery.of(context).padding.top + 8,
      left: 0,
      right: 0,
      child: RouteAlertBanner(
        key: ValueKey(topAlert.id),
        alert: topAlert,
        onDismiss: () => onDismiss(topAlert.id),
        onViewOnMap: onViewOnMap,
      ),
    );
  }
}
