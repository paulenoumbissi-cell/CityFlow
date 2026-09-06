import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../providers/city_flow_provider.dart';
import '../widgets/cityflow_brand_header.dart';

enum _AuthStep {
  form,            // Étape 1 : Saisie des informations (Nom, Adresse, Téléphone, Ville)
  otpVerification, // Étape 2 : Saisie du code reçu par SMS / WhatsApp style Yango
  success          // Étape 3 : Compte activé avec succès & Bienvenue
}

class AuthScreen extends StatefulWidget {
  final VoidCallback? onAuthSuccess;
  const AuthScreen({super.key, this.onAuthSuccess});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  _AuthStep _currentStep = _AuthStep.form;
  bool _isSignUp = true; // Par défaut en création de compte

  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  String _selectedCity = 'Yaoundé';
  String _selectedChannel = 'sms'; // 'sms' ou 'whatsapp'

  // Contrôleurs pour les 6 cases de code OTP (Style Yango)
  final List<TextEditingController> _otpControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());

  bool _isLoading = false;
  String? _errorMessage;
  String? _receivedOtpPreview; // Pour afficher la notification / bannière SMS simulée
  int _countdownSeconds = 45;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    // Pré-remplir avec les données du profil existant si disponibles
    final provider = Provider.of<CityFlowProvider>(context, listen: false);
    if (provider.userName.isNotEmpty && provider.userName != 'Conducteur CityFlow' && provider.userName != 'Conducteur Invité') {
      _nameController.text = provider.userName;
    }
    if (provider.userAddress.isNotEmpty && provider.userAddress != 'Cameroun') {
      _addressController.text = provider.userAddress;
    }
    final cleanP = provider.userPhone.replaceAll('+237', '').replaceAll(' ', '').replaceAll('-', '');
    if (cleanP.isNotEmpty && cleanP.length == 9) {
      _phoneController.text = cleanP;
    }
    _selectedCity = provider.selectedCity;
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _nameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    for (final c in _otpControllers) {
      c.dispose();
    }
    for (final f in _otpFocusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    setState(() => _countdownSeconds = 45);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdownSeconds > 0) {
        setState(() => _countdownSeconds--);
      } else {
        timer.cancel();
      }
    });
  }

  String _getFullPhoneNumber() {
    final raw = _phoneController.text.trim().replaceAll(RegExp(r'\s+'), '');
    if (raw.startsWith('+237')) return raw;
    if (raw.startsWith('237')) return '+$raw';
    return '+237$raw';
  }

  // ===================================================================
  // 1. ENVOI DU CODE OTP DE CRÉATION DE COMPTE (STYLE YANGO)
  // ===================================================================
  Future<void> _submitFormAndSendOtp() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final provider = context.read<CityFlowProvider>();
    final fullPhone = _getFullPhoneNumber();

    final result = await provider.sendAuthOtp(
      phone: fullPhone,
      name: _nameController.text.trim(),
      address: _addressController.text.trim(),
      city: _selectedCity,
      channel: _selectedChannel,
    );

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      final previewCode = result['previewCode'] as String? ?? '849201';
      setState(() {
        _receivedOtpPreview = previewCode;
        _currentStep = _AuthStep.otpVerification;
      });

      // Vider les cases OTP et donner le focus à la 1ère case
      for (final c in _otpControllers) {
        c.clear();
      }
      _startCountdown();

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _otpFocusNodes.isNotEmpty) {
          _otpFocusNodes.first.requestFocus();
        }
      });

      // Retour haptique
      HapticFeedback.mediumImpact();
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Impossible d\'envoyer le code de vérification.';
      });
    }
  }

  // ===================================================================
  // 2. VÉRIFICATION DU CODE OTP
  // ===================================================================
  Future<void> _verifyOtpCode() async {
    final enteredCode = _otpControllers.map((c) => c.text.trim()).join();

    if (enteredCode.length < 6) {
      setState(() {
        _errorMessage = 'Veuillez saisir les 6 chiffres du code de confirmation.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final provider = context.read<CityFlowProvider>();
    final fullPhone = _getFullPhoneNumber();

    final result = await provider.verifyAuthOtp(
      phone: fullPhone,
      code: enteredCode,
      name: _nameController.text.trim(),
      address: _addressController.text.trim(),
      city: _selectedCity,
      channel: _selectedChannel,
    );

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      setState(() {
        _currentStep = _AuthStep.success;
      });
      HapticFeedback.heavyImpact();
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Code de confirmation erroné. Veuillez réessayer.';
      });
      HapticFeedback.vibrate();
    }
  }

  void _fillOtpAutomatically(String code) {
    if (code.length != 6) return;
    for (int i = 0; i < 6; i++) {
      _otpControllers[i].text = code[i];
    }
    setState(() {
      _errorMessage = null;
    });
    _verifyOtpCode();
  }

  void _resendCode() async {
    if (_countdownSeconds > 0) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final provider = context.read<CityFlowProvider>();
    final fullPhone = _getFullPhoneNumber();

    final result = await provider.sendAuthOtp(
      phone: fullPhone,
      name: _nameController.text.trim(),
      address: _addressController.text.trim(),
      city: _selectedCity,
      channel: _selectedChannel,
    );

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      final previewCode = result['previewCode'] as String? ?? '123456';
      setState(() {
        _receivedOtpPreview = previewCode;
      });
      _startCountdown();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Nouveau code envoyé par ${_selectedChannel.toUpperCase()} !'),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _finishAuthAndExit() {
    final provider = context.read<CityFlowProvider>();
    provider.enterApp();
    if (widget.onAuthSuccess != null) {
      widget.onAuthSuccess!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentStep == _AuthStep.form && Navigator.of(context).canPop(),
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_currentStep == _AuthStep.otpVerification) {
          setState(() {
            _currentStep = _AuthStep.form;
            _errorMessage = null;
          });
        } else if (_currentStep == _AuthStep.success) {
          _finishAuthAndExit();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: (_currentStep == _AuthStep.form && !Navigator.of(context).canPop())
              ? null
              : IconButton(
                  icon: const Icon(Icons.arrow_back_rounded, color: AppColors.navy),
                  onPressed: () {
                    if (_currentStep == _AuthStep.otpVerification) {
                      setState(() {
                        _currentStep = _AuthStep.form;
                        _errorMessage = null;
                      });
                    } else if (_currentStep == _AuthStep.success) {
                      _finishAuthAndExit();
                    } else if (Navigator.of(context).canPop()) {
                      Navigator.of(context).pop();
                    }
                  },
                ),
          title: Text(
            _currentStep == _AuthStep.otpVerification
                ? 'Vérification du numéro'
                : (_currentStep == _AuthStep.success ? 'Compte Confirmé' : (_isSignUp ? 'Créer un compte' : 'Connexion')),
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: AppColors.navy),
          ),
          centerTitle: true,
        ),
        body: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _buildCurrentStepView(),
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentStepView() {
    switch (_currentStep) {
      case _AuthStep.form:
        return _buildFormStep();
      case _AuthStep.otpVerification:
        return _buildOtpVerificationStep();
      case _AuthStep.success:
        return _buildSuccessStep();
    }
  }

  // ===================================================================
  // ÉTAPE 1 : FORMULAIRE YANGO (NOM, ADRESSE/QUARTIER, TÉLÉPHONE)
  // ===================================================================
  Widget _buildFormStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Logo & Badge Cameroun
            Center(
              child: Column(
                children: [
                  const CityFlowBrandHeader(logoSize: 42, showSlogan: true),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2FE),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFBAE6FD)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('🇨🇲', style: TextStyle(fontSize: 14)),
                        SizedBox(width: 6),
                        Text(
                          'Cameroun • Yaoundé & Douala',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0284C7),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),

            // Toggle Inscription / Connexion rapide
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _isSignUp = true),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _isSignUp ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: _isSignUp
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.08),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : [],
                        ),
                        child: Center(
                          child: Text(
                            'Créer un compte',
                            style: TextStyle(
                              color: _isSignUp ? AppColors.navy : const Color(0xFF64748B),
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _isSignUp = false),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: !_isSignUp ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: !_isSignUp
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.08),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : [],
                        ),
                        child: Center(
                          child: Text(
                            'Connexion rapide',
                            style: TextStyle(
                              color: !_isSignUp ? AppColors.navy : const Color(0xFF64748B),
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Message d'erreur
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 1. CHAMP NOM COMPLET (Si inscription)
            if (_isSignUp) ...[
              const Text(
                'NOM COMPLET',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  hintText: 'ex: Paule Noumbissi',
                  prefixIcon: const Icon(Icons.person_rounded, color: Color(0xFF006666)),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFF006666), width: 2),
                  ),
                ),
                validator: (val) {
                  if (!_isSignUp) return null;
                  if (val == null || val.trim().isEmpty) return 'Veuillez saisir votre nom complet';
                  return null;
                },
              ),
              const SizedBox(height: 16),
            ],

            // 2. CHAMP ADRESSE / QUARTIER (Si inscription)
            if (_isSignUp) ...[
              const Text(
                'ADRESSE & QUARTIER DE RÉSIDENCE',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _addressController,
                decoration: InputDecoration(
                  hintText: 'ex: Bastos (Face Ambassade) ou Akwa (Blvd Liberté)',
                  prefixIcon: const Icon(Icons.location_on_rounded, color: Color(0xFF006666)),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFF006666), width: 2),
                  ),
                ),
                validator: (val) {
                  if (!_isSignUp) return null;
                  if (val == null || val.trim().isEmpty) return 'Veuillez indiquer votre quartier ou adresse';
                  return null;
                },
              ),
              const SizedBox(height: 16),
            ],

            // 3. VILLE PRINCIPALE
            const Text(
              'VILLE PRINCIPALE',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedCity = 'Yaoundé'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _selectedCity == 'Yaoundé' ? const Color(0xFF006666) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedCity == 'Yaoundé' ? const Color(0xFF006666) : const Color(0xFFCBD5E1),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '🏛️ Yaoundé (Centre)',
                          style: TextStyle(
                            color: _selectedCity == 'Yaoundé' ? Colors.white : AppColors.navy,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedCity = 'Douala'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _selectedCity == 'Douala' ? const Color(0xFF006666) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedCity == 'Douala' ? const Color(0xFF006666) : const Color(0xFFCBD5E1),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '🚢 Douala (Littoral)',
                          style: TextStyle(
                            color: _selectedCity == 'Douala' ? Colors.white : AppColors.navy,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 4. NUMÉRO DE TÉLÉPHONE STYLE YANGO (+237 6XX XX XX XX)
            const Text(
              'NUMÉRO DE TÉLÉPHONE',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9),
              ],
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1.0),
              decoration: InputDecoration(
                hintText: '699 12 34 56',
                prefixIcon: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🇨🇲', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 6),
                      const Text(
                        '+237',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.navy),
                      ),
                      const SizedBox(width: 8),
                      Container(height: 20, width: 1, color: const Color(0xFFCBD5E1)),
                    ],
                  ),
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFF006666), width: 2),
                ),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) return 'Numéro de téléphone requis';
                if (val.trim().length < 9) return 'Le numéro camerounais doit comporter 9 chiffres';
                return null;
              },
            ),
            const SizedBox(height: 16),

            // 5. CANAL DE RÉCEPTION DU CODE OTP (SMS / WHATSAPP)
            const Text(
              'ENVOI DU CODE DE SÉCURITÉ PAR :',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedChannel = 'sms'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: _selectedChannel == 'sms' ? const Color(0xFFE0F2FE) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedChannel == 'sms' ? const Color(0xFF0284C7) : const Color(0xFFCBD5E1),
                          width: _selectedChannel == 'sms' ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.sms_rounded, color: _selectedChannel == 'sms' ? const Color(0xFF0284C7) : const Color(0xFF64748B), size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'SMS (Direct)',
                            style: TextStyle(
                              color: _selectedChannel == 'sms' ? const Color(0xFF0284C7) : const Color(0xFF64748B),
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedChannel = 'whatsapp'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: _selectedChannel == 'whatsapp' ? const Color(0xFFDCFCE7) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedChannel == 'whatsapp' ? const Color(0xFF16A34A) : const Color(0xFFCBD5E1),
                          width: _selectedChannel == 'whatsapp' ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.chat_bubble_rounded, color: _selectedChannel == 'whatsapp' ? const Color(0xFF16A34A) : const Color(0xFF64748B), size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'WhatsApp',
                            style: TextStyle(
                              color: _selectedChannel == 'whatsapp' ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // BOUTON PRINCIPAL YANGO : RECEVOIR LE CODE
            ElevatedButton(
              onPressed: _isLoading ? null : _submitFormAndSendOtp,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF006666),
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 3,
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _isSignUp ? 'Recevoir mon code de création' : 'Recevoir mon code de connexion',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward_rounded, size: 20),
                      ],
                    ),
            ),
            const SizedBox(height: 16),

            // Bouton Invité
            Center(
              child: TextButton.icon(
                onPressed: () {
                  final provider = context.read<CityFlowProvider>();
                  provider.continueAsGuest();
                  if (widget.onAuthSuccess != null) {
                    widget.onAuthSuccess!();
                  } else if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
                icon: const Icon(Icons.explore_rounded, size: 18, color: Color(0xFF64748B)),
                label: const Text(
                  'Continuer en mode découverte (Invité)',
                  style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===================================================================
  // ÉTAPE 2 : ÉCRAN DE SAISIE DU CODE OTP (STYLE YANGO)
  // ===================================================================
  Widget _buildOtpVerificationStep() {
    final fullPhone = _getFullPhoneNumber();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // BANNIÈRE SIMULATION SMS YANGO INTERACTIVE EN HAUT
          if (_receivedOtpPreview != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF064E3B), Color(0xFF00875A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF00875A).withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.sms_rounded, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SMS reçu de CityFlow',
                          style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Code : $_receivedOtpPreview',
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF00875A),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _fillOtpAutomatically(_receivedOtpPreview!),
                    child: const Text('Insérer', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
          ],

          // Titre explicatif
          const Center(
            child: Icon(Icons.lock_clock_rounded, size: 48, color: Color(0xFF006666)),
          ),
          const SizedBox(height: 12),
          const Text(
            'Saisissez le code de confirmation',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: AppColors.navy),
          ),
          const SizedBox(height: 8),
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
              children: [
                const TextSpan(text: 'Un code à 6 chiffres a été envoyé au\n'),
                TextSpan(
                  text: fullPhone,
                  style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.navy),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Center(
            child: TextButton.icon(
              onPressed: () => setState(() => _currentStep = _AuthStep.form),
              icon: const Icon(Icons.edit_rounded, size: 14, color: Color(0xFF0284C7)),
              label: const Text('Modifier le numéro', style: TextStyle(color: Color(0xFF0284C7), fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 20),

          // Message d'erreur OTP
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFCA5A5)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
          ],

          // 6 CASES DE CODE OTP STYLE YANGO
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(6, (index) {
              return SizedBox(
                width: 46,
                height: 56,
                child: TextFormField(
                  controller: _otpControllers[index],
                  focusNode: _otpFocusNodes[index],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.navy),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(1),
                  ],
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: EdgeInsets.zero,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF006666), width: 2.5),
                    ),
                  ),
                  onChanged: (value) {
                    if (value.isNotEmpty && index < 5) {
                      _otpFocusNodes[index + 1].requestFocus();
                    } else if (value.isEmpty && index > 0) {
                      _otpFocusNodes[index - 1].requestFocus();
                    }
                    if (_otpControllers.every((c) => c.text.isNotEmpty)) {
                      _verifyOtpCode();
                    }
                  },
                ),
              );
            }),
          ),
          const SizedBox(height: 24),

          // BOUTON VALIDER LE CODE
          ElevatedButton(
            onPressed: _isLoading ? null : _verifyOtpCode,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF006666),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 3,
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                  )
                : const Text(
                    'Valider & Activer mon compte',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                  ),
          ),
          const SizedBox(height: 18),

          // COMPTE À REBOURS ET RENVOI DU CODE
          Center(
            child: _countdownSeconds > 0
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.timer_outlined, size: 16, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text(
                        'Renvoyer un nouveau code dans 00:${_countdownSeconds.toString().padLeft(2, '0')}',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  )
                : TextButton.icon(
                    onPressed: _resendCode,
                    icon: const Icon(Icons.refresh_rounded, color: Color(0xFF006666), size: 18),
                    label: Text(
                      'Renvoyer le code par ${_selectedChannel.toUpperCase()}',
                      style: const TextStyle(color: Color(0xFF006666), fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  // ===================================================================
  // ÉTAPE 3 : CONFIRMATION DU COMPTE & SUCCÈS STYLE YANGO
  // ===================================================================
  Widget _buildSuccessStep() {
    final provider = context.watch<CityFlowProvider>();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Icône Animée de Succès
          Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF16A34A), width: 3),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF16A34A).withValues(alpha: 0.25),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Center(
              child: Icon(Icons.check_rounded, color: Color(0xFF16A34A), size: 54),
            ),
          ),
          const SizedBox(height: 24),

          // Titre de Félicitations
          const Text(
            'Bienvenue sur CityFlow !',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 24, color: AppColors.navy),
          ),
          const SizedBox(height: 8),
          const Text(
            'Votre compte a été vérifié et activé avec succès. Vous bénéficiez de toutes les fonctionnalités de navigation et d\'entraide citoyenne.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
          ),
          const SizedBox(height: 24),

          // Fiche Récapitulative du Profil
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFCBD5E1)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: const Color(0xFF006666),
                      child: Text(
                        provider.userName.isNotEmpty ? provider.userName.substring(0, 1) : 'C',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            provider.userName,
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
                          ),
                          Text(
                            provider.userPhone,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.verified_rounded, color: Color(0xFF16A34A), size: 14),
                          SizedBox(width: 4),
                          Text(
                            'Actif',
                            style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Divider(color: Color(0xFFF1F5F9), height: 1),
                ),
                Row(
                  children: [
                    const Icon(Icons.location_city_rounded, color: Color(0xFF006666), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${provider.userAddress} • ${provider.selectedCity}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.stars_rounded, color: Color(0xFFF59E0B), size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      'Bonus de Bienvenue : +100 XP Citoyen',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // BOUTON FINAL : COMMENCER À ROULER
          ElevatedButton(
            onPressed: _finishAuthAndExit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF006666),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 4,
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Commencer à rouler sur CityFlow',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                ),
                SizedBox(width: 8),
                Icon(Icons.directions_car_rounded, size: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
