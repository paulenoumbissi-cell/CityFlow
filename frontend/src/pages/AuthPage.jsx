import { useState, useEffect, useRef } from "react";
import {
  Phone,
  MessageSquare,
  Smartphone,
  Mail,
  Lock,
  User,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Siren,
  Shield,
  Car,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

const DEMO_PHONE_PROFILES = [
  {
    name: "Paule Noumbissi",
    phone: "699001122",
    formatted: "+237 699 00 11 22",
    role: "citizen",
    roleLabel: "Conducteur / Citoyen",
    city: "Yaoundé",
    vehicleType: "Voiture particulière",
    operator: "Orange 🟠",
    icon: Car,
    color: "#00875a",
  },
  {
    name: "Dr. Paul Ebanda (SAMU)",
    phone: "677123456",
    formatted: "+237 677 12 34 56",
    role: "emergency",
    roleLabel: "Services d'Urgence / SAMU",
    city: "Yaoundé",
    vehicleType: "Ambulance / SAMU",
    operator: "MTN 🟡",
    icon: Siren,
    color: "#dc2626",
  },
  {
    name: "Superviseur Mairie",
    phone: "620998877",
    formatted: "+237 620 99 88 77",
    role: "traffic_manager",
    roleLabel: "Régulateur Urbain (Mairie)",
    city: "Douala",
    vehicleType: "Véhicule d'urgence officiel",
    operator: "Camtel 🔵",
    icon: Shield,
    color: "#2563eb",
  },
];

const DEMO_EMAIL_ACCOUNTS = [
  {
    label: "Conducteur / Citoyen",
    email: "conducteur@cityflow.cm",
    role: "citizen",
    icon: Car,
    badge: "Usage Quotidien",
    color: "#00875a",
  },
  {
    label: "Services d'Urgence / SAMU",
    email: "samu@cityflow.cm",
    role: "emergency",
    icon: Siren,
    badge: "Onde Verte Prioritaire",
    color: "#dc2626",
  },
  {
    label: "Régulateur Urbain (Mairie)",
    email: "regulateur@cityflow.cm",
    role: "traffic_manager",
    icon: Shield,
    badge: "Supervision du Réseau",
    color: "#2563eb",
  },
];

function detectOperator(phone) {
  const clean = phone.replace(/[^0-9]/g, "");
  const num = clean.startsWith("237") ? clean.slice(3) : clean;
  if (!num || num.length < 2) return null;
  const prefix2 = num.slice(0, 2);
  const prefix3 = num.slice(0, 3);

  if (["67", "68"].includes(prefix2) || ["650", "651", "652", "653", "654"].includes(prefix3)) {
    return { name: "MTN Cameroon", badge: "MTN 🟡", color: "#eab308" };
  }
  if (["69"].includes(prefix2) || ["655", "656", "657", "658", "659"].includes(prefix3)) {
    return { name: "Orange Cameroun", badge: "Orange 🟠", color: "#f97316" };
  }
  if (["62", "22", "23", "24"].includes(prefix2)) {
    return { name: "Camtel / Nexttel", badge: "Camtel 🔵", color: "#3b82f6" };
  }
  return { name: "Réseau Mobile", badge: "GSM 🟢", color: "#10b981" };
}

function AuthPage() {
  const navigate = useNavigate();
  const { login, register, sendOtpCode, verifyOtpCode, resendOtpCode, isLoading } = useAuth();

  // Mode principal : "phone" (OTP SMS / WhatsApp) ou "email" (classique)
  const [authMethod, setAuthMethod] = useState("phone"); // "phone" | "email"
  
  // États Phone OTP
  const [phoneStep, setPhoneStep] = useState(1); // 1 = Saisie numéro/canal, 2 = Saisie OTP 6 chiffres
  const [phoneChannel, setPhoneChannel] = useState("whatsapp"); // "whatsapp" | "sms"
  const [phoneNumber, setPhoneNumber] = useState("699001122");
  const [phoneName, setPhoneName] = useState("Paule Noumbissi");
  const [phoneRole, setPhoneRole] = useState("citizen");
  const [phoneCity, setPhoneCity] = useState("Yaoundé");
  const [phoneVehicle, setPhoneVehicle] = useState("Voiture particulière");

  // OTP State (6 chiffres)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpInputRefs = useRef([]);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Notification Toast simulée
  const [incomingMessageToast, setIncomingMessageToast] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // États Email classiques
  const [isLoginEmail, setIsLoginEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    name: "",
    email: "conducteur@cityflow.cm",
    password: "password123",
    city: "Yaoundé",
    role: "citizen",
    vehicleType: "Voiture particulière",
  });

  // Messages
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

  // Formatage timer mm:ss
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const detectedOp = detectOperator(phoneNumber);

  // Sélection d'un profil démo téléphone
  const handleSelectDemoPhone = (demo) => {
    setPhoneNumber(demo.phone);
    setPhoneName(demo.name);
    setPhoneRole(demo.role);
    setPhoneCity(demo.city);
    setPhoneVehicle(demo.vehicleType);
    setErrorMessage("");
  };

  // ENVOI DU CODE OTP (Étape 1)
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIncomingMessageToast(null);

    const clean = phoneNumber.replace(/[^0-9]/g, "");
    if (!clean || clean.length < 8) {
      setErrorMessage("Veuillez saisir un numéro de téléphone valide (ex: 699 00 11 22).");
      return;
    }

    try {
      const formattedPhone = clean.startsWith("237") ? `+${clean}` : `+237 ${clean}`;
      const res = await sendOtpCode({
        phone: formattedPhone,
        channel: phoneChannel,
        name: phoneName || "Utilisateur CityFlow",
        role: phoneRole,
        city: phoneCity,
        vehicleType: phoneVehicle,
      });

      setPhoneStep(2);
      setTimerSeconds(300);
      setIsTimerActive(true);
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccessMessage(res.message || `Code de vérification envoyé par ${phoneChannel === "whatsapp" ? "WhatsApp" : "SMS"}.`);

      // Déclenche l'affichage du Toast de notification réaliste
      if (res.previewCode) {
        setIncomingMessageToast({
          channel: phoneChannel,
          sender: phoneChannel === "whatsapp" ? "CityFlow Security 💬" : "CityFlow SMS 📱",
          code: res.previewCode,
          message: res.previewMessage,
          phone: formattedPhone,
        });
      }

      // Auto-focus sur le premier champ après transition
      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }, 300);
    } catch (err) {
      setErrorMessage(err.message || "Erreur lors de l'envoi du code.");
    }
  };

  // RENVOI DU CODE OTP
  const handleResendOtp = async () => {
    setErrorMessage("");
    try {
      const clean = phoneNumber.replace(/[^0-9]/g, "");
      const formattedPhone = clean.startsWith("237") ? `+${clean}` : `+237 ${clean}`;
      const res = await resendOtpCode({
        phone: formattedPhone,
        channel: phoneChannel,
      });

      setTimerSeconds(300);
      setIsTimerActive(true);
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccessMessage("Nouveau code généré et expédié !");

      if (res.previewCode) {
        setIncomingMessageToast({
          channel: phoneChannel,
          sender: phoneChannel === "whatsapp" ? "CityFlow Security 💬" : "CityFlow SMS 📱",
          code: res.previewCode,
          message: res.previewMessage,
          phone: formattedPhone,
        });
      }
    } catch (err) {
      setErrorMessage(err.message || "Impossible de renvoyer le code.");
    }
  };

  // GESTION DES 6 CHAMPS OTP
  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setErrorMessage("");

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Si tous les 6 chiffres sont remplis, déclencher la vérification automatiquement
    if (digit && index === 5 && newDigits.every((d) => d !== "")) {
      submitOtpVerification(newDigits.join(""));
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

    if (pasted.length === 6) {
      submitOtpVerification(pasted);
    } else {
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    }
  };

  // AUTO-REMPLISSAGE DEPUIS LE TOAST NOTIFICATION
  const handleAutofillFromToast = () => {
    if (!incomingMessageToast?.code) return;
    const codeStr = incomingMessageToast.code.toString();
    const newDigits = codeStr.split("");
    setOtpDigits(newDigits);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    submitOtpVerification(codeStr);
  };

  // SOUMISSION & VÉRIFICATION DU CODE OTP
  const submitOtpVerification = async (codeToVerify) => {
    const fullCode = codeToVerify || otpDigits.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Veuillez saisir les 6 chiffres du code reçu.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const clean = phoneNumber.replace(/[^0-9]/g, "");
      const formattedPhone = clean.startsWith("237") ? `+${clean}` : `+237 ${clean}`;

      await verifyOtpCode({
        phone: formattedPhone,
        code: fullCode,
        channel: phoneChannel,
        name: phoneName || "Conducteur CityFlow",
        role: phoneRole,
        city: phoneCity,
        vehicleType: phoneVehicle,
      });

      setSuccessMessage("✅ Authentification réussie ! Redirection vers votre tableau de bord...");
      setTimeout(() => {
        navigate("/profil");
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || "Code incorrect ou expiré.");
    }
  };

  // SOUMISSION EMAIL CLASSIQUE
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (isLoginEmail) {
        await login(emailFormData.email, emailFormData.password);
        setSuccessMessage("Connexion réussie !");
      } else {
        await register(emailFormData);
        setSuccessMessage("Compte créé avec succès !");
      }

      setTimeout(() => {
        navigate("/profil");
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || "Erreur de connexion.");
    }
  };

  return (
    <main className="auth-page">
      {/* TOAST FLOTTANT RÉALISTE : MESSAGE ENTRANT WHATSAPP / SMS */}
      {incomingMessageToast && phoneStep === 2 && (
        <div className={`incoming-message-toast ${incomingMessageToast.channel}`}>
          <div className="toast-header">
            <div className="toast-sender">
              {incomingMessageToast.channel === "whatsapp" ? (
                <div className="channel-icon-circle whatsapp">
                  <MessageSquare size={16} />
                </div>
              ) : (
                <div className="channel-icon-circle sms">
                  <Smartphone size={16} />
                </div>
              )}
              <div>
                <strong>{incomingMessageToast.sender}</strong>
                <span>À l'instant • {incomingMessageToast.phone}</span>
              </div>
            </div>
            <span className="live-pill">SIMULATION EN DIRECT</span>
          </div>

          <div className="toast-body">
            <p className="toast-text">{incomingMessageToast.message}</p>
            <div className="toast-code-display">
              <span className="code-label">CODE REÇU :</span>
              <span className="code-val">{incomingMessageToast.code}</span>
            </div>
          </div>

          <div className="toast-actions">
            <button
              type="button"
              className="toast-autofill-btn"
              onClick={handleAutofillFromToast}
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCode ? "Code appliqué !" : "Remplir et valider automatiquement"}</span>
            </button>
          </div>
        </div>
      )}

      <div className="auth-card">
        {/* SÉLECTEUR DE MÉTHODE PRINCIPALE : TÉLÉPHONE (SMS/WHATSAPP) vs EMAIL */}
        <div className="auth-method-switcher">
          <button
            type="button"
            className={`method-pill ${authMethod === "phone" ? "active" : ""}`}
            onClick={() => {
              setAuthMethod("phone");
              setErrorMessage("");
            }}
          >
            <Smartphone size={15} />
            <span>Téléphone (WhatsApp / SMS)</span>
            <span className="recommended-badge">Recommandé</span>
          </button>
          <button
            type="button"
            className={`method-pill ${authMethod === "email" ? "active" : ""}`}
            onClick={() => {
              setAuthMethod("email");
              setErrorMessage("");
            }}
          >
            <Mail size={15} />
            <span>Email & Mot de passe</span>
          </button>
        </div>

        {/* EN-TÊTE DU FORMULAIRE */}
        <div className="auth-header">
          <span className="auth-badge">CITYFLOW AUTHENTIFICATION SÉCURISÉE</span>
          <h1>
            {authMethod === "phone"
              ? phoneStep === 1
                ? "Connexion par Numéro de Téléphone"
                : "Vérification du Code OTP"
              : isLoginEmail
              ? "Accédez à votre espace"
              : "Rejoignez CityFlow"}
          </h1>
          <p>
            {authMethod === "phone"
              ? phoneStep === 1
                ? "Recevez instantanément votre code à 6 chiffres par message WhatsApp ou SMS direct."
                : `Entrez le code à 6 chiffres envoyé à votre numéro via ${
                    phoneChannel === "whatsapp" ? "WhatsApp 💬" : "SMS 📱"
                  }.`
              : isLoginEmail
              ? "Connectez-vous pour piloter vos itinéraires, alertes et préférences."
              : "Créez votre compte pour optimiser vos trajets à Yaoundé et Douala."}
          </p>
        </div>

        {/* MESSAGE DE SUCCÈS */}
        {successMessage && (
          <div className="auth-alert success">
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        )}

        {/* MESSAGE D'ERREUR */}
        {errorMessage && (
          <div className="auth-alert error">
            <AlertTriangle size={18} />
            {errorMessage}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 1 : AUTHENTIFICATION TÉLÉPHONE (WHATSAPP & SMS) */}
        {/* ========================================================= */}
        {authMethod === "phone" && (
          <div className="phone-auth-container">
            {/* ÉTAPE 1 : Saisie numéro, choix canal WhatsApp/SMS et profil */}
            {phoneStep === 1 && (
              <>
                {/* PROFILS DÉMO RAPIDES */}
                <div className="demo-accounts-box">
                  <span className="demo-title">
                    <Sparkles size={14} color="#00875a" /> Numéros de test rapides (Cameroun) :
                  </span>
                  <div className="demo-chips">
                    {DEMO_PHONE_PROFILES.map((demo) => {
                      const Icon = demo.icon;
                      const isSelected = phoneNumber === demo.phone;
                      return (
                        <button
                          key={demo.phone}
                          type="button"
                          className={`demo-chip ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectDemoPhone(demo)}
                        >
                          <Icon size={14} color={demo.color} />
                          <div className="demo-chip-text">
                            <strong>{demo.name}</strong>
                            <small>{demo.formatted} ({demo.operator})</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form className="auth-form" onSubmit={handleSendOtp}>
                  {/* SÉLECTION DU CANAL DE RÉCEPTION (WHATSAPP vs SMS) */}
                  <div className="form-group">
                    <label>Canal de réception du code de vérification :</label>
                    <div className="channel-selector-grid">
                      <button
                        type="button"
                        className={`channel-option whatsapp ${phoneChannel === "whatsapp" ? "selected" : ""}`}
                        onClick={() => setPhoneChannel("whatsapp")}
                      >
                        <div className="channel-icon-wrap">
                          <MessageSquare size={20} />
                        </div>
                        <div className="channel-desc">
                          <strong>WhatsApp</strong>
                          <span>Message instantané</span>
                        </div>
                        {phoneChannel === "whatsapp" && <Check size={16} className="channel-check" />}
                      </button>

                      <button
                        type="button"
                        className={`channel-option sms ${phoneChannel === "sms" ? "selected" : ""}`}
                        onClick={() => setPhoneChannel("sms")}
                      >
                        <div className="channel-icon-wrap">
                          <Smartphone size={20} />
                        </div>
                        <div className="channel-desc">
                          <strong>SMS Direct</strong>
                          <span>Message texte GSM</span>
                        </div>
                        {phoneChannel === "sms" && <Check size={16} className="channel-check" />}
                      </button>
                    </div>
                  </div>

                  {/* SAISIE DU NUMÉRO DE TÉLÉPHONE */}
                  <div className="form-group">
                    <div className="label-with-badge">
                      <label htmlFor="phone-input">Numéro de téléphone mobile</label>
                      {detectedOp && (
                        <span className="operator-badge" style={{ borderColor: detectedOp.color }}>
                          {detectedOp.badge}
                        </span>
                      )}
                    </div>

                    <div className="phone-input-group">
                      <div className="country-prefix">
                        <span>🇨🇲 +237</span>
                      </div>
                      <input
                        id="phone-input"
                        type="tel"
                        className="phone-field"
                        placeholder="699 00 11 22"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          setErrorMessage("");
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* INFORMATIONS DU PROFIL */}
                  <div className="form-group">
                    <label htmlFor="phone-name">Nom complet ou pseudonyme</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        id="phone-name"
                        placeholder="Ex: Paule Noumbissi"
                        value={phoneName}
                        onChange={(e) => setPhoneName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="phone-role">Rôle / Profil</label>
                      <div className="input-wrapper">
                        <select
                          id="phone-role"
                          value={phoneRole}
                          onChange={(e) => setPhoneRole(e.target.value)}
                        >
                          <option value="citizen">🚗 Citoyen / Conducteur</option>
                          <option value="emergency">🚑 Services d'Urgence</option>
                          <option value="traffic_manager">🚦 Régulateur Mairie</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone-city">Ville</label>
                      <div className="input-wrapper">
                        <MapPin size={18} className="input-icon" />
                        <select
                          id="phone-city"
                          value={phoneCity}
                          onChange={(e) => setPhoneCity(e.target.value)}
                        >
                          <option value="Yaoundé">Yaoundé</option>
                          <option value="Douala">Douala</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn otp-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span>Envoi en cours...</span>
                    ) : (
                      <>
                        <span>
                          Recevoir le code par {phoneChannel === "whatsapp" ? "WhatsApp" : "SMS"}
                        </span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ÉTAPE 2 : Saisie des 6 chiffres OTP */}
            {phoneStep === 2 && (
              <div className="otp-step-box">
                {/* RAPPEL NUMÉRO & RETOUR */}
                <div className="otp-target-bar">
                  <button
                    type="button"
                    className="otp-back-btn"
                    onClick={() => {
                      setPhoneStep(1);
                      setErrorMessage("");
                      setIncomingMessageToast(null);
                    }}
                  >
                    <ChevronLeft size={16} /> Modifier le numéro
                  </button>
                  <div className="otp-target-info">
                    <span>Code envoyé à :</span>
                    <strong>+237 {phoneNumber}</strong>
                    <span className="target-channel-badge">
                      {phoneChannel === "whatsapp" ? "💬 WhatsApp" : "📱 SMS"}
                    </span>
                  </div>
                </div>

                {/* 6 CASES OTP */}
                <div className="otp-inputs-grid" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`otp-digit-input ${digit ? "filled" : ""}`}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e.key)}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                {/* COMPTE À REBOURS & RENVOI */}
                <div className="otp-timer-container">
                  <div className="timer-info">
                    <RefreshCw size={14} className={isTimerActive ? "spinning" : ""} />
                    <span>
                      {isTimerActive
                        ? `Code valide pendant : ${formatTimer(timerSeconds)}`
                        : "Le code a expiré."}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="resend-otp-btn"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                  >
                    Renvoyer un nouveau code
                  </button>
                </div>

                <button
                  type="button"
                  className="auth-submit-btn"
                  onClick={() => submitOtpVerification()}
                  disabled={isLoading || otpDigits.some((d) => !d)}
                >
                  {isLoading ? "Vérification en cours..." : "Valider et continuer"}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 2 : AUTHENTIFICATION EMAIL TRADITIONNELLE */}
        {/* ========================================================= */}
        {authMethod === "email" && (
          <div className="email-auth-container">
            {/* ACCÈS RAPIDE COMPTES DÉMO EMAIL */}
            {isLoginEmail && (
              <div className="demo-accounts-box">
                <span className="demo-title">
                  <Sparkles size={14} color="#00875a" /> Accès Rapide Démo :
                </span>
                <div className="demo-chips">
                  {DEMO_EMAIL_ACCOUNTS.map((demo) => {
                    const Icon = demo.icon;
                    const isSelected = emailFormData.email === demo.email;
                    return (
                      <button
                        key={demo.email}
                        type="button"
                        className={`demo-chip ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          setEmailFormData({
                            ...emailFormData,
                            email: demo.email,
                            password: "password123",
                            role: demo.role,
                          });
                          setErrorMessage("");
                        }}
                      >
                        <Icon size={14} color={demo.color} />
                        <span>{demo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ONGLETS SE CONNECTER / CRÉER COMPTE EMAIL */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${isLoginEmail ? "active" : ""}`}
                onClick={() => {
                  setIsLoginEmail(true);
                  setErrorMessage("");
                }}
              >
                Se connecter
              </button>
              <button
                type="button"
                className={`auth-tab ${!isLoginEmail ? "active" : ""}`}
                onClick={() => {
                  setIsLoginEmail(false);
                  setErrorMessage("");
                }}
              >
                Créer un compte
              </button>
            </div>

            <form className="auth-form" onSubmit={handleEmailSubmit}>
              {!isLoginEmail && (
                <>
                  <div className="form-group">
                    <label htmlFor="name">Nom complet</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        id="name"
                        placeholder="Ex: Paule Noumbissi"
                        value={emailFormData.name}
                        onChange={(e) =>
                          setEmailFormData({ ...emailFormData, name: e.target.value })
                        }
                        required={!isLoginEmail}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="role">Type de profil / Fonction</label>
                    <div className="input-wrapper">
                      <select
                        id="role"
                        value={emailFormData.role}
                        onChange={(e) =>
                          setEmailFormData({ ...emailFormData, role: e.target.value })
                        }
                      >
                        <option value="citizen">🚗 Conducteur / Citoyen</option>
                        <option value="emergency">🚑 Services d'Urgence (SAMU)</option>
                        <option value="traffic_manager">🚦 Régulateur Urbain / Mairie</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="vehicleType">Moyen de transport principal</label>
                    <div className="input-wrapper">
                      <select
                        id="vehicleType"
                        value={emailFormData.vehicleType}
                        onChange={(e) =>
                          setEmailFormData({ ...emailFormData, vehicleType: e.target.value })
                        }
                      >
                        <option value="Voiture particulière">Voiture particulière</option>
                        <option value="Taxi urbain">Taxi urbain (Jaune)</option>
                        <option value="Moto-taxi (Bend-skin)">Moto-taxi (Bend-skin)</option>
                        <option value="Transport en commun / Bus">Transport en commun / Bus</option>
                        <option value="Véhicule d'urgence">Véhicule d'urgence officiel</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="email">Adresse e-mail</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    placeholder="votre.email@cityflow.cm"
                    value={emailFormData.email}
                    onChange={(e) =>
                      setEmailFormData({ ...emailFormData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {!isLoginEmail && (
                <div className="form-group">
                  <label htmlFor="city">Ville de résidence principale</label>
                  <div className="input-wrapper">
                    <MapPin size={18} className="input-icon" />
                    <select
                      id="city"
                      value={emailFormData.city}
                      onChange={(e) =>
                        setEmailFormData({ ...emailFormData, city: e.target.value })
                      }
                    >
                      <option value="Yaoundé">📍 Yaoundé (Centre)</option>
                      <option value="Douala">📍 Douala (Littoral)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="password">Mot de passe</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="••••••••"
                    value={emailFormData.password}
                    onChange={(e) =>
                      setEmailFormData({ ...emailFormData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading
                  ? "Vérification..."
                  : isLoginEmail
                  ? "Se connecter"
                  : "Créer mon compte"}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}

        {/* PIED DE CARTE */}
        <div className="auth-footer">
          <Link to="/" className="back-home-link">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;