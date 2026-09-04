import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  Bot,
  Sparkles,
  KeyRound,
  Compass,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resetOtpPassword } from "../services/api";
import "./AuthPage.css";

function AuthPage() {
  const navigate = useNavigate();
  const { login, register, sendOtpCode, verifyOtpCode, resendOtpCode, isLoading } = useAuth();

  // Mode d'affichage : "login" (Connexion standard), "register" (Inscription), "forgot" (Mot de passe oublié)
  const [viewMode, setViewMode] = useState("login"); // "login" | "register" | "forgot"

  // Sous-étape pour l'inscription / récupération (1 = Coordonnées, 2 = Code OTP, 3 = Test Anti-Robot & Finalisation)
  const [otpStep, setOtpStep] = useState(1);

  // Champs de connexion classique
  const [loginIdentifier, setLoginIdentifier] = useState("conducteur@cityflow.cm");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);

  // Champs d'inscription & récupération
  const [name, setName] = useState("Paule Noumbissi");
  const [identifier, setIdentifier] = useState("699001122");
  const [channel, setChannel] = useState("whatsapp"); // "whatsapp" | "sms" | "email"
  const [newPassword, setNewPassword] = useState("password123");
  const [confirmPassword, setConfirmPassword] = useState("password123");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [role, setRole] = useState("citizen");
  const [city, setCity] = useState("Yaoundé");

  // Code OTP (6 chiffres)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpInputRefs = useRef([]);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [previewToast, setPreviewToast] = useState(null);
  const [copied, setCopied] = useState(false);

  // Test Anti-Robot (Slider / Interactive Human Check)
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderTrackRef = useRef(null);

  // Messages d'état
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Gestion du décompte du timer
  useEffect(() => {
    let interval = null;
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSeconds]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleIdentifierChange = (value) => {
    setIdentifier(value);
    setErrorMessage("");
    if (value.includes("@") && channel !== "email") {
      setChannel("email");
    } else if (!value.includes("@") && channel === "email") {
      setChannel("whatsapp");
    }
  };

  // -------------------------------------------------------------
  // 1. CONNEXION CLASSIQUE (Vue Principale par Défaut)
  // -------------------------------------------------------------
  const handleClassicLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage("Veuillez renseigner votre identifiant et votre mot de passe.");
      return;
    }

    try {
      await login(loginIdentifier.trim(), loginPassword);
      setSuccessMessage("✅ Connexion réussie ! Redirection en cours...");
      setTimeout(() => {
        navigate("/profil");
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || "Identifiant ou mot de passe incorrect.");
    }
  };

  // -------------------------------------------------------------
  // 2. ENVOI DU CODE OTP (Pour Inscription ou Mot de passe oublié)
  // -------------------------------------------------------------
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setPreviewToast(null);

    const cleanId = identifier.trim();
    if (!cleanId || cleanId.length < 4) {
      setErrorMessage("Veuillez entrer un numéro ou une adresse e-mail valide.");
      return;
    }

    try {
      let formattedId = cleanId;
      if (!cleanId.includes("@")) {
        const digits = cleanId.replace(/[^0-9]/g, "");
        formattedId = digits.startsWith("237") ? `+${digits}` : `+237 ${digits}`;
      }

      const res = await sendOtpCode({
        name: name.trim() || "Utilisateur CityFlow",
        identifier: formattedId,
        channel,
        role,
        city,
      });

      setOtpStep(2);
      setTimerSeconds(300);
      setIsTimerActive(true);
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccessMessage(res.message || "Code de sécurité envoyé.");

      if (res.previewCode) {
        setPreviewToast({
          channel,
          code: res.previewCode,
          target: formattedId,
        });
      }

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err) {
      setErrorMessage(err.message || "Impossible d'envoyer le code.");
    }
  };

  // -------------------------------------------------------------
  // 3. RENVOI DU CODE OTP
  // -------------------------------------------------------------
  const handleResendOtp = async () => {
    setErrorMessage("");
    try {
      let formattedId = identifier.trim();
      if (!identifier.includes("@")) {
        const digits = identifier.replace(/[^0-9]/g, "");
        formattedId = digits.startsWith("237") ? `+${digits}` : `+237 ${digits}`;
      }

      const res = await resendOtpCode({
        name: name.trim(),
        identifier: formattedId,
        channel,
      });

      setTimerSeconds(300);
      setIsTimerActive(true);
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccessMessage("Nouveau code généré et envoyé.");

      if (res.previewCode) {
        setPreviewToast({
          channel,
          code: res.previewCode,
          target: formattedId,
        });
      }
    } catch (err) {
      setErrorMessage(err.message || "Erreur de renvoi.");
    }
  };

  // -------------------------------------------------------------
  // 4. GESTION DES CASES OTP (6 Chiffres)
  // -------------------------------------------------------------
  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setErrorMessage("");

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleAutofillCode = () => {
    if (!previewToast?.code) return;
    const codeStr = previewToast.code.toString();
    setOtpDigits(codeStr.split(""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------
  // 5. VÉRIFICATION DU CODE OTP -> PASSAGE AU TEST ANTI-ROBOT
  // -------------------------------------------------------------
  const handleProceedToCaptcha = (e) => {
    if (e) e.preventDefault();
    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Veuillez entrer les 6 chiffres du code reçu.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    setOtpStep(3);
  };

  // -------------------------------------------------------------
  // 6. GESTION DU SLIDER ANTI-ROBOT
  // -------------------------------------------------------------
  const handleSliderMouseDown = () => {
    if (isCaptchaVerified) return;
    setIsDragging(true);
  };

  const handleSliderMouseMove = (e) => {
    if (!isDragging || isCaptchaVerified || !sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    const offset = Math.max(0, Math.min(clientX - rect.left - 24, rect.width - 48));
    const percentage = (offset / (rect.width - 48)) * 100;
    setSliderPosition(percentage);

    if (percentage > 92) {
      setIsCaptchaVerified(true);
      setIsDragging(false);
      setSliderPosition(100);
      handleFinalSubmission();
    }
  };

  const handleSliderMouseUp = () => {
    if (isCaptchaVerified) return;
    setIsDragging(false);
    if (sliderPosition <= 92) {
      setSliderPosition(0);
    }
  };

  // -------------------------------------------------------------
  // 7. FINALISATION (INSCRIPTION OU RÉINITIALISATION)
  // -------------------------------------------------------------
  const handleFinalSubmission = async () => {
    setErrorMessage("");
    setSuccessMessage("Test anti-robot validé avec succès !");

    try {
      let formattedId = identifier.trim();
      if (!identifier.includes("@")) {
        const digits = identifier.replace(/[^0-9]/g, "");
        formattedId = digits.startsWith("237") ? `+${digits}` : `+237 ${digits}`;
      }

      if (viewMode === "forgot") {
        await resetOtpPassword({
          identifier: formattedId,
          newPassword,
        });
        setSuccessMessage("✅ Mot de passe modifié avec succès ! Connexion en cours...");
      } else {
        await verifyOtpCode({
          name: name.trim(),
          identifier: formattedId,
          code: otpDigits.join(""),
          channel,
          role,
          city,
        });
        setSuccessMessage("✅ Compte créé et vérifié avec succès ! Bienvenue.");
      }

      setTimeout(() => {
        navigate("/profil");
      }, 900);
    } catch (err) {
      setIsCaptchaVerified(false);
      setSliderPosition(0);
      setErrorMessage(err.message || "Code invalide. Veuillez réessayer.");
      setOtpStep(viewMode === "forgot" ? 3 : 2);
    }
  };

  return (
    <main className="auth-glass-screen">
      {/* TOAST FLOTTANT DISCRET POUR DÉMO */}
      {previewToast && otpStep >= 2 && (
        <div className="glass-demo-toast">
          <div className="toast-text-group">
            <span className="toast-chip">CODE DÉMO {channel.toUpperCase()}</span>
            <span>Code : <strong className="toast-code">{previewToast.code}</strong></span>
          </div>
          <button type="button" className="toast-btn-action" onClick={handleAutofillCode}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Inséré !" : "Remplir"}</span>
          </button>
        </div>
      )}

      {/* CARTE GLASSMORPHIC CENTRALE */}
      <div className="glass-auth-box">
        {/* EN-TÊTE : LOGO CITYFLOW & BRANDING */}
        <div className="glass-brand-header">
          <div className="cityflow-logo-icon">
            <Compass size={28} color="#087f5b" />
          </div>
          <span className="cityflow-logo-title">CityFlow</span>
          <span className="cityflow-badge">Plateforme Intelligente de Mobilité</span>
        </div>

        {/* ALERTE ERREUR / SUCCÈS */}
        {errorMessage && (
          <div className="glass-alert error">
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="glass-alert success">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 1 : PAGE DE CONNEXION PRINCIPALE (LOGO + NOM + MOT DE PASSE + BOUTON) */}
        {/* ========================================================================= */}
        {viewMode === "login" && (
          <form className="glass-body-form" onSubmit={handleClassicLogin}>
            <div className="glass-field">
              <label htmlFor="login-id">Nom d'utilisateur, E-mail ou Téléphone</label>
              <div className="glass-input-wrapper">
                <User size={18} className="glass-field-icon" />
                <input
                  id="login-id"
                  type="text"
                  placeholder="ex: Paule Noumbissi ou 699 00 11 22"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setErrorMessage("");
                  }}
                  required
                />
              </div>
            </div>

            <div className="glass-field">
              <label htmlFor="login-pass">Mot de passe</label>
              <div className="glass-input-wrapper">
                <Lock size={18} className="glass-field-icon" />
                <input
                  id="login-pass"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="glass-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* BOUTON SE CONNECTER */}
            <button type="submit" className="glass-primary-btn" disabled={isLoading}>
              <span>{isLoading ? "Vérification..." : "Se connecter"}</span>
              <ArrowRight size={18} />
            </button>

            {/* LIENS : S'INSCRIRE & MOT DE PASSE OUBLIÉ */}
            <div className="glass-links-footer">
              <button
                type="button"
                className="glass-text-link"
                onClick={() => {
                  setViewMode("forgot");
                  setOtpStep(1);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              >
                Mot de passe oublié ?
              </button>

              <div className="glass-register-line">
                <span>Vous n'avez pas de compte ?</span>
                <button
                  type="button"
                  className="glass-highlight-link"
                  onClick={() => {
                    setViewMode("register");
                    setOtpStep(1);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                >
                  S'inscrire
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VUE 2 : S'INSCRIRE (NOM + CONTACT + CANAL + OTP + ANTI-ROBOT)            */}
        {/* ========================================================================= */}
        {viewMode === "register" && (
          <div className="glass-body-form">
            <div className="glass-sub-header">
              <h2>Créer un compte CityFlow</h2>
              <p>Recevez votre code de sécurité par WhatsApp, SMS ou Email.</p>
            </div>

            {/* Étape 1 : Saisie coordonnées */}
            {otpStep === 1 && (
              <form onSubmit={handleSendOtp} className="glass-sub-form">
                <div className="glass-field">
                  <label htmlFor="reg-name">Nom complet</label>
                  <div className="glass-input-wrapper">
                    <User size={18} className="glass-field-icon" />
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Ex: Paule Noumbissi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="glass-field">
                  <label htmlFor="reg-contact">Adresse e-mail ou Numéro de téléphone</label>
                  <div className="glass-input-wrapper">
                    {identifier.includes("@") ? (
                      <Mail size={18} className="glass-field-icon" />
                    ) : (
                      <Phone size={18} className="glass-field-icon" />
                    )}
                    <input
                      id="reg-contact"
                      type="text"
                      placeholder="699 00 11 22 ou nom@cityflow.cm"
                      value={identifier}
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Sélecteur de canal */}
                <div className="glass-field">
                  <label>Recevoir le code de vérification par :</label>
                  <div className="glass-channels-grid">
                    <button
                      type="button"
                      className={`glass-chan-card ${channel === "whatsapp" ? "active-wa" : ""}`}
                      onClick={() => setChannel("whatsapp")}
                    >
                      <MessageSquare size={16} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      className={`glass-chan-card ${channel === "sms" ? "active-sms" : ""}`}
                      onClick={() => setChannel("sms")}
                    >
                      <Smartphone size={16} />
                      <span>SMS Direct</span>
                    </button>
                    <button
                      type="button"
                      className={`glass-chan-card ${channel === "email" ? "active-mail" : ""}`}
                      onClick={() => setChannel("email")}
                    >
                      <Mail size={16} />
                      <span>E-mail</span>
                    </button>
                  </div>
                </div>

                <div className="glass-row-2">
                  <div className="glass-field">
                    <label>Profil</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="citizen">🚗 Citoyen / Conducteur</option>
                      <option value="emergency">🚑 Services d'Urgence</option>
                      <option value="traffic_manager">🚦 Régulateur (Mairie)</option>
                    </select>
                  </div>
                  <div className="glass-field">
                    <label>Ville</label>
                    <select value={city} onChange={(e) => setCity(e.target.value)}>
                      <option value="Yaoundé">Yaoundé</option>
                      <option value="Douala">Douala</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="glass-primary-btn" disabled={isLoading}>
                  <span>{isLoading ? "Envoi du code..." : "Recevoir mon code →"}</span>
                </button>
              </form>
            )}

            {/* Étape 2 : Code OTP */}
            {otpStep === 2 && (
              <form onSubmit={handleProceedToCaptcha} className="glass-sub-form">
                <div className="glass-recap-bar">
                  <span>Code envoyé à <strong>{identifier}</strong> via {channel.toUpperCase()}</span>
                  <button type="button" onClick={() => setOtpStep(1)} className="recap-btn">
                    <ChevronLeft size={14} /> Modifier
                  </button>
                </div>

                <div className="glass-field">
                  <label>Saisissez le code à 6 chiffres :</label>
                  <div className="glass-otp-grid" onPaste={handleOtpPaste}>
                    {otpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpInputRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={`glass-otp-digit ${d ? "filled" : ""}`}
                        value={d}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e.key)}
                      />
                    ))}
                  </div>
                </div>

                <div className="glass-timer-row">
                  <span><RefreshCw size={13} className={isTimerActive ? "spin" : ""} /> {isTimerActive ? formatTimer(timerSeconds) : "Code expiré"}</span>
                  <button type="button" onClick={handleResendOtp} className="glass-resend-btn" disabled={isLoading}>
                    Renvoyer un code
                  </button>
                </div>

                <button type="submit" className="glass-primary-btn" disabled={isLoading || otpDigits.some((d) => !d)}>
                  <span>Passer au test anti-robot →</span>
                </button>
              </form>
            )}

            {/* Étape 3 : Test Anti-Robot */}
            {otpStep === 3 && (
              <div
                className="glass-sub-form"
                onMouseMove={handleSliderMouseMove}
                onMouseUp={handleSliderMouseUp}
                onTouchMove={handleSliderMouseMove}
                onTouchEnd={handleSliderMouseUp}
              >
                <div className="glass-captcha-card">
                  <div className="captcha-badge-icon">
                    {isCaptchaVerified ? <ShieldCheck size={32} color="#059669" /> : <Bot size={32} color="#087f5b" />}
                  </div>
                  <h3>{isCaptchaVerified ? "Validation réussie !" : "Vérification de sécurité anti-robot"}</h3>
                  <p>Glissez le curseur vers la droite pour prouver que vous n'êtes pas un robot.</p>

                  <div className={`glass-slider-track ${isCaptchaVerified ? "verified" : ""}`} ref={sliderTrackRef}>
                    <div className="slider-fill-track" style={{ width: `${sliderPosition}%` }}></div>
                    <div
                      className="slider-knob-btn"
                      style={{ left: `calc(${sliderPosition}% - ${sliderPosition * 0.4}px)` }}
                      onMouseDown={handleSliderMouseDown}
                      onTouchStart={handleSliderMouseDown}
                    >
                      {isCaptchaVerified ? <Check size={18} color="#fff" /> : <ArrowRight size={18} color="#087f5b" />}
                    </div>
                    <span className="slider-hint-text">
                      {isCaptchaVerified ? "Vérifié avec succès ✓" : "Glisser pour vérifier →"}
                    </span>
                  </div>
                </div>

                {!isCaptchaVerified && (
                  <button
                    type="button"
                    className="glass-direct-click-btn"
                    onClick={() => {
                      setIsCaptchaVerified(true);
                      setSliderPosition(100);
                      handleFinalSubmission();
                    }}
                  >
                    <CheckCircle2 size={16} /> Je ne suis pas un robot (Clic rapide)
                  </button>
                )}
              </div>
            )}

            <div className="glass-bottom-switch">
              <button
                type="button"
                className="glass-back-link"
                onClick={() => {
                  setViewMode("login");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              >
                ← Déjà un compte ? Se connecter
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 3 : MOT DE PASSE OUBLIÉ (RÉCUPÉRATION PAR CODE OTP + ANTI-ROBOT)       */}
        {/* ========================================================================= */}
        {viewMode === "forgot" && (
          <div className="glass-body-form">
            <div className="glass-sub-header">
              <h2>Réinitialiser le mot de passe</h2>
              <p>Recevez un code de sécurité temporaire pour débloquer votre accès.</p>
            </div>

            {otpStep === 1 && (
              <form onSubmit={handleSendOtp} className="glass-sub-form">
                <div className="glass-field">
                  <label htmlFor="forgot-contact">Votre e-mail ou numéro de téléphone</label>
                  <div className="glass-input-wrapper">
                    {identifier.includes("@") ? (
                      <Mail size={18} className="glass-field-icon" />
                    ) : (
                      <Phone size={18} className="glass-field-icon" />
                    )}
                    <input
                      id="forgot-contact"
                      type="text"
                      placeholder="699 00 11 22 ou votre.email@cityflow.cm"
                      value={identifier}
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="glass-field">
                  <label>Recevoir le code de réinitialisation par :</label>
                  <div className="glass-channels-grid">
                    <button
                      type="button"
                      className={`glass-chan-card ${channel === "whatsapp" ? "active-wa" : ""}`}
                      onClick={() => setChannel("whatsapp")}
                    >
                      <MessageSquare size={16} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      className={`glass-chan-card ${channel === "sms" ? "active-sms" : ""}`}
                      onClick={() => setChannel("sms")}
                    >
                      <Smartphone size={16} />
                      <span>SMS Direct</span>
                    </button>
                    <button
                      type="button"
                      className={`glass-chan-card ${channel === "email" ? "active-mail" : ""}`}
                      onClick={() => setChannel("email")}
                    >
                      <Mail size={16} />
                      <span>E-mail</span>
                    </button>
                  </div>
                </div>

                <button type="submit" className="glass-primary-btn" disabled={isLoading}>
                  <span>{isLoading ? "Envoi en cours..." : "Envoyer le code de réinitialisation →"}</span>
                </button>
              </form>
            )}

            {otpStep === 2 && (
              <form onSubmit={handleProceedToCaptcha} className="glass-sub-form">
                <div className="glass-recap-bar">
                  <span>Code envoyé à <strong>{identifier}</strong></span>
                  <button type="button" onClick={() => setOtpStep(1)} className="recap-btn">
                    <ChevronLeft size={14} /> Modifier
                  </button>
                </div>

                <div className="glass-field">
                  <label>Code à 6 chiffres reçu :</label>
                  <div className="glass-otp-grid" onPaste={handleOtpPaste}>
                    {otpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpInputRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={`glass-otp-digit ${d ? "filled" : ""}`}
                        value={d}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e.key)}
                      />
                    ))}
                  </div>
                </div>

                <div className="glass-timer-row">
                  <span><RefreshCw size={13} className={isTimerActive ? "spin" : ""} /> {isTimerActive ? formatTimer(timerSeconds) : "Expiré"}</span>
                  <button type="button" onClick={handleResendOtp} className="glass-resend-btn" disabled={isLoading}>
                    Renvoyer le code
                  </button>
                </div>

                <button type="submit" className="glass-primary-btn" disabled={isLoading || otpDigits.some((d) => !d)}>
                  <span>Valider et continuer →</span>
                </button>
              </form>
            )}

            {/* Étape 3 : Définir le nouveau mot de passe */}
            {otpStep === 3 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPassword || newPassword.length < 6) {
                    setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setErrorMessage("Les deux mots de passe ne correspondent pas.");
                    return;
                  }
                  setErrorMessage("");
                  setOtpStep(4);
                }}
                className="glass-sub-form"
              >
                <div className="glass-field">
                  <label htmlFor="new-pass">Nouveau mot de passe</label>
                  <div className="glass-input-wrapper">
                    <Lock size={18} className="glass-field-icon" />
                    <input
                      id="new-pass"
                      type={showNewPass ? "text" : "password"}
                      placeholder="Minimum 6 caractères"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="glass-password-toggle"
                      onClick={() => setShowNewPass(!showNewPass)}
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="glass-field">
                  <label htmlFor="confirm-pass">Confirmer le nouveau mot de passe</label>
                  <div className="glass-input-wrapper">
                    <Lock size={18} className="glass-field-icon" />
                    <input
                      id="confirm-pass"
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="Retapez le mot de passe"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="glass-password-toggle"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                    >
                      {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="glass-primary-btn">
                  <span>Valider mon nouveau mot de passe →</span>
                </button>
              </form>
            )}

            {/* Étape 4 : Test Anti-Robot & Validation finale */}
            {otpStep === 4 && (
              <div
                className="glass-sub-form"
                onMouseMove={handleSliderMouseMove}
                onMouseUp={handleSliderMouseUp}
                onTouchMove={handleSliderMouseMove}
                onTouchEnd={handleSliderMouseUp}
              >
                <div className="glass-captcha-card">
                  <div className="captcha-badge-icon">
                    {isCaptchaVerified ? <ShieldCheck size={32} color="#059669" /> : <KeyRound size={32} color="#087f5b" />}
                  </div>
                  <h3>{isCaptchaVerified ? "Accès restauré !" : "Test Anti-Robot de Sécurité"}</h3>
                  <p>Glissez vers la droite pour enregistrer définitivement votre nouveau mot de passe.</p>

                  <div className={`glass-slider-track ${isCaptchaVerified ? "verified" : ""}`} ref={sliderTrackRef}>
                    <div className="slider-fill-track" style={{ width: `${sliderPosition}%` }}></div>
                    <div
                      className="slider-knob-btn"
                      style={{ left: `calc(${sliderPosition}% - ${sliderPosition * 0.4}px)` }}
                      onMouseDown={handleSliderMouseDown}
                      onTouchStart={handleSliderMouseDown}
                    >
                      {isCaptchaVerified ? <Check size={18} color="#fff" /> : <ArrowRight size={18} color="#087f5b" />}
                    </div>
                    <span className="slider-hint-text">
                      {isCaptchaVerified ? "Vérifié avec succès ✓" : "Glisser pour valider →"}
                    </span>
                  </div>
                </div>

                {!isCaptchaVerified && (
                  <button
                    type="button"
                    className="glass-direct-click-btn"
                    onClick={() => {
                      setIsCaptchaVerified(true);
                      setSliderPosition(100);
                      handleFinalSubmission();
                    }}
                  >
                    <CheckCircle2 size={16} /> Je ne suis pas un robot (Clic direct)
                  </button>
                )}
              </div>
            )}

            <div className="glass-bottom-switch">
              <button
                type="button"
                className="glass-back-link"
                onClick={() => {
                  setViewMode("login");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              >
                ← Retour à la connexion
              </button>
            </div>
          </div>
        )}

        {/* PIED DE CARTE */}
        <div className="glass-card-bottom-link">
          <Link to="/" className="glass-home-link">
            ← Retour à l'accueil CityFlow
          </Link>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;