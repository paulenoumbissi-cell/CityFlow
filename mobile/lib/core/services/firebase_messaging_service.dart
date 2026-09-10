import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Service pour gérer les notifications push en arrière-plan via FCM.
class FirebaseMessagingService {
  static final FirebaseMessagingService _instance = FirebaseMessagingService._internal();

  factory FirebaseMessagingService() {
    return _instance;
  }

  FirebaseMessagingService._internal();

  bool _isInitialized = false;

  /// Initialise Firebase et le service de messagerie.
  /// Gère élégamment l'absence de configuration Firebase (utile en dev).
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // 1. Initialiser Firebase
      await Firebase.initializeApp();

      // 2. Demander les permissions (pour iOS et Android 13+)
      FirebaseMessaging messaging = FirebaseMessaging.instance;
      NotificationSettings settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: true,
        provisional: false,
        sound: true,
      );

      debugPrint('[FCM] Permission status: ${settings.authorizationStatus}');

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        
        // 3. Récupérer le token FCM de l'appareil
        String? token = await messaging.getToken();
        debugPrint('[FCM] Token généré : $token');

        if (token != null) {
          // Envoyer le token au backend
          await _sendTokenToBackend(token);
        }

        // Écouter le rafraîchissement du token
        messaging.onTokenRefresh.listen((newToken) {
          _sendTokenToBackend(newToken);
        });

        // 4. Configurer les écouteurs de messages
        // Messages reçus en premier plan (Foreground)
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('[FCM] Message Foreground reçu : ${message.notification?.title}');
          // Note : Les alertes geo-contextuelles sont déjà gérées par WebSocket.
          // FCM sert surtout pour l'arrière-plan ou pour des alertes globales importantes.
        });

        // Clic sur une notification depuis l'arrière-plan
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          debugPrint('[FCM] Notification cliquée ! Redirection en cours...');
          // TODO: Gérer la navigation selon le type de message (message.data['type'])
        });

        _isInitialized = true;
        debugPrint('[FCM] 🟢 Service Push initialisé avec succès.');
      } else {
        debugPrint('[FCM] 🔴 Permissions refusées par l\'utilisateur.');
      }
    } catch (e) {
      debugPrint('[FCM] ⚠️ Firebase non configuré ou erreur : $e');
      debugPrint('[FCM] ⚠️ Passage en mode "Mock" silencieux (Les Push ne fonctionneront pas).');
    }
  }

  /// Envoie le token FCM au backend via ApiService
  Future<void> _sendTokenToBackend(String token) async {
    try {
      // Pour l'instant, on envoie un token factice/local pour éviter les erreurs d'auth.
      // Dans une app de prod, on récupèrerait le vrai JWT depuis le stockage.
      final userToken = 'jwt_cityflow_local_demo'; 
      await CityFlowMobileApiService.updateFcmToken(token, userToken);
      debugPrint('[FCM] Token envoyé au serveur.');
    } catch (e) {
      debugPrint('[FCM] Erreur envoi token : $e');
    }
  }
}

/// Handler global pour les messages reçus en arrière-plan (Background)
/// DOIT être une fonction de haut niveau (top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // L'initialisation de Firebase est requise même en background
  await Firebase.initializeApp();
  debugPrint('[FCM] 📩 Message Background reçu : ${message.notification?.title}');
}
