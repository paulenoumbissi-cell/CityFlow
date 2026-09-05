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

  static const List<String> _candidateWsUrls = [
    'ws://127.0.0.1:3000/ws',
    'ws://192.168.1.123:3000/ws',
    'ws://10.0.2.2:3000/ws',
    'ws://localhost:3000/ws',
  ];

  static String get defaultWsUrl {
    if (kIsWeb) {
      return 'ws://localhost:3000/ws';
    }
    return _candidateWsUrls.first;
  }

  void connect({String? customUrl}) {
    if (_socket != null && (_status == WsConnectionStatus.connected || _status == WsConnectionStatus.connecting)) {
      return;
    }

    _isManualDisconnect = false;
    _setStatus(WsConnectionStatus.connecting);
    _reconnectTimer?.cancel();

    _tryConnectCandidates(customUrl != null ? [customUrl] : _candidateWsUrls);
  }

  Future<void> _tryConnectCandidates(List<String> candidates) async {
    for (final url in candidates) {
      if (_isManualDisconnect) return;
      try {
        debugPrint('⚡ [CityFlow Mobile WS] Tentative vers $url...');
        _socket = await WebSocket.connect(url).timeout(const Duration(seconds: 2));
        _setStatus(WsConnectionStatus.connected);
        debugPrint('✅ [CityFlow Mobile WS] Connecté au serveur temps réel ($url) !');

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
        return;
      } catch (_) {
        // Tenter candidat suivant
      }
    }
    _setStatus(WsConnectionStatus.disconnected);
    _scheduleReconnect(_candidateWsUrls.first);
  }

  void _scheduleReconnect(String url) {
    if (_isManualDisconnect) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      debugPrint('🔄 [CityFlow Mobile WS] Reconnexion automatique...');
      _tryConnectCandidates(_candidateWsUrls);
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
