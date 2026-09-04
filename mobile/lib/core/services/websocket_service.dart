import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

enum WsConnectionStatus { connected, connecting, disconnected }

class CityFlowWebSocketService {
  static final CityFlowWebSocketService _instance = CityFlowWebSocketService._internal();
  factory CityFlowWebSocketService() => _instance;
  CityFlowWebSocketService._internal();

  WebSocket? _socket;
  WsConnectionStatus _status = WsConnectionStatus.disconnected;
  Timer? _reconnectTimer;
  String? _subscribedCity;
  bool _isManualDisconnect = false;

  // Stream controllers
  final _statusController = StreamController<WsConnectionStatus>.broadcast();
  final _messageController = StreamController<Map<String, dynamic>>.broadcast();

  // Getters
  WsConnectionStatus get status => _status;
  Stream<WsConnectionStatus> get statusStream => _statusController.stream;
  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  bool get isConnected => _status == WsConnectionStatus.connected;

  static String get defaultWsUrl {
    if (kIsWeb) {
      return 'ws://localhost:3000/ws';
    }
    if (Platform.isAndroid) {
      return 'ws://10.0.2.2:3000/ws';
    }
    return 'ws://localhost:3000/ws';
  }

  void connect({String? customUrl}) {
    final url = customUrl ?? defaultWsUrl;
    if (_socket != null && (_status == WsConnectionStatus.connected || _status == WsConnectionStatus.connecting)) {
      return;
    }

    _isManualDisconnect = false;
    _setStatus(WsConnectionStatus.connecting);

    _reconnectTimer?.cancel();

    _connectInternal(url);
  }

  Future<void> _connectInternal(String url) async {
    try {
      debugPrint('⚡ [CityFlow Mobile WS] Connexion vers $url...');
      _socket = await WebSocket.connect(url).timeout(const Duration(seconds: 4));
      
      _setStatus(WsConnectionStatus.connected);
      debugPrint('✅ [CityFlow Mobile WS] Connecté au serveur temps réel !');

      if (_subscribedCity != null) {
        subscribeCity(_subscribedCity!);
      }

      _socket!.listen(
        (data) {
          try {
            if (data is String) {
              final parsed = json.decode(data);
              if (parsed is Map<String, dynamic>) {
                _messageController.add(parsed);
              }
            }
          } catch (e) {
            debugPrint('❌ [CityFlow Mobile WS] Erreur décodage JSON: $e');
          }
        },
        onDone: () {
          debugPrint('⚠️ [CityFlow Mobile WS] Connexion terminée.');
          _setStatus(WsConnectionStatus.disconnected);
          _scheduleReconnect(url);
        },
        onError: (error) {
          debugPrint('❌ [CityFlow Mobile WS] Erreur socket: $error');
          _setStatus(WsConnectionStatus.disconnected);
          _scheduleReconnect(url);
        },
        cancelOnError: true,
      );
    } catch (e) {
      debugPrint('⚠️ [CityFlow Mobile WS] Échec de connexion: $e');
      _setStatus(WsConnectionStatus.disconnected);
      _scheduleReconnect(url);
    }
  }

  void _scheduleReconnect(String url) {
    if (_isManualDisconnect) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 4), () {
      debugPrint('🔄 [CityFlow Mobile WS] Reconnexion automatique...');
      _connectInternal(url);
    });
  }

  void subscribeCity(String city) {
    _subscribedCity = city;
    send({'type': 'SUBSCRIBE_CITY', 'city': city});
  }

  void send(Map<String, dynamic> data) {
    if (_socket != null && _status == WsConnectionStatus.connected) {
      try {
        _socket!.add(json.encode(data));
      } catch (e) {
        debugPrint('❌ [CityFlow Mobile WS] Erreur envoi: $e');
      }
    }
  }

  void _setStatus(WsConnectionStatus newStatus) {
    _status = newStatus;
    if (!_statusController.isClosed) {
      _statusController.add(newStatus);
    }
  }

  void disconnect() {
    _isManualDisconnect = true;
    _reconnectTimer?.cancel();
    _socket?.close();
    _socket = null;
    _setStatus(WsConnectionStatus.disconnected);
  }

  void dispose() {
    disconnect();
    _statusController.close();
    _messageController.close();
  }
}
