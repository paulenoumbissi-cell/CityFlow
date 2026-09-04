import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
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
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

function AuthPage() {
  const navigate = useNavigate();
  const { sendOtpCode, verifyOtpCode, resendOtpCode, isLoading } = useAuth();

  // Étape du tunnel : 1 = Coordonnées, 2 = Code OTP, 3 = Test Anti-Robot
  const [step, setStep] = useState(1);

  // Étape 1 : Données utilisateur
  const [name, setName] = useState("Paule Noumbissi");
  const [identifier, setIdentifier] = useState("699001122"); // email ou téléphone
  const [channel, setChannel] = useState("whatsapp"); // "whatsapp" | "sms" | "email"
  const [role, setRole] = useState("citizen");
  const [city, setCity] = useState("Yaoundé");

  // Étape 2 : Code OTP (6 cases)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpInputRefs = useRef([]);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [previewToast, setPreviewToast] = useState(null);
  const [copied, setCopied] = useState(false);

  // Étape 3 : Test Anti-Robot (Slider / Interactive Human Check)
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderTrackRef = useRef(null);

  // Messages d'état
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Auto-ajustement du canal si l'utilisateur saisit un email ou téléphone
  const handleIdentifierChange = (value) => {
    setIdentifier(value);
    setErrorMessage("");
    if (value.includes("@") && channel !== "email") {
      setChannel("email");
    } else if (!value.includes("@") && channel === "email") {
      setChannel("whatsapp");
    }
  };

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

  // -------------------------------------------------------------
  // ACTION 1 : ENVOYER LE CODE (Étape 1 -> Étape 2)
  // -------------------------------------------------------------
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setPreviewToast(null);

    const cleanName = name.trim();
    const cleanId = identifier.trim();

    if (!cleanName) {
      setErrorMessage("Veuillez renseigner votre nom complet.");
      return;
    }
    if (!cleanId || cleanId.length < 4) {
      setErrorMessage("Veuillez saisir une adresse e-mail ou un numéro de téléphone valide.");
      return;
    }

    try {
      const isEmail = cleanId.includes("@");
      let formattedId = cleanId;
      if (!isEmail) {
        const digits = cleanId.replace(/[^0-9]/g, "");
        formattedId = digits.startsWith("237") ? `+${digits}` : `+237 ${digits}`;
      }

      const res = await sendOtpCode({
        name: cleanName,
        identifier: formattedId,
        channel,
        role,
        city,
      });

      setStep(2);
      setTimerSeconds(300);
      setIsTimerActive(true);
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccessMessage(res.message || "Code d'authentification envoyé avec succès.");

      if (res.previewCode) {
        setPreviewToast({
          channel,
          code: res.previewCode,
          message: res.previewMessage,
          target: formattedId,
        });
      }

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err) {
      setErrorMessage(err.message || "Erreur d'envoi du code.");
    }
  };

  // -------------------------------------------------------------
  // ACTION 2 : RENVOYER LE CODE
  // -------------------------------------------------------------
  const handleResendOtp = async () => {
    setErrorMessage("");
    try {
      const isEmail = identifier.includes("@");
      let formattedId = identifier.trim();
      if (!isEmail) {
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
      setSuccessMessage("Un nouveau code de sécurité vous a été envoyé.");

      if (res.previewCode) {
        setPreviewToast({
          channel,
          code: res.previewCode,
          message: res.previewMessage,
          target: formattedId,
        });
      }
    } catch (err) {
      setErrorMessage(err.message || "Impossible de renvoyer le code.");
    }
  };

  // -------------------------------------------------------------
  // GESTION DES CASES OTP (Étape 2)
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
  // ACTION 3 : VÉRIFIER LE CODE OTP -> PASSER AU TEST ANTI-ROBOT (Étape 2 -> Étape 3)
  // -------------------------------------------------------------
  const handleVerifyOtpAndProceedToCaptcha = (e) => {
    if (e) e.preventDefault();
    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Veuillez saisir les 6 chiffres du code reçu.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    // Passage à l'étape 3 : Test anti-robot
    setStep(3);
  };

  // -------------------------------------------------------------
  // GESTION DU SLIDER ANTI-ROBOT (Étape 3)
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
  // ACTION FINALE : VALIDATION SERVEUR & REDIRECTION
  // -------------------------------------------------------------
  const handleFinalSubmission = async () => {
    setErrorMessage("");
    setSuccessMessage("Test anti-robot réussi ! Finalisation de la session...");

    try {
      const isEmail = identifier.includes("@");
      let formattedId = identifier.trim();
      if (!isEmail) {
        const digits = identifier.replace(/[^0-9]/g, "");
        formattedId = digits.startsWith("237") ? `+${digits}` : `+237 ${digits}`;
      }

      await verifyOtpCode({
        name: name.trim(),
        identifier: formattedId,
        code: otpDigits.join(""),
        channel,
        role,
        city,
      });

      setSuccessMessage("✅ Authentification réussie ! Bienvenue sur CityFlow.");
      setTimeout(() => {
        navigate("/profil");
      }, 900);
    } catch (err) {
      setIsCaptchaVerified(false);
      setSliderPosition(0);
      setErrorMessage(err.message || "Code invalide. Veuillez réessayer.");
      setStep(2); // Retour à la saisie du code si erreur
    }
  };

  const isEmail = identifier.includes("@");

  return (
    <main className="auth-clean-page">
      {/* TOAST DISCRET DE PRÉVISUALISATION DU CODE EN DÉMO */}
      {previewToast && step >= 2 && (
        <div className="clean-demo-toast">
          <div className="toast-left">
            <span className="toast-tag">TEST RAPIDE</span>
            <span className="toast-info">
              Code reçu via <strong>{channel.toUpperCase()}</strong> : <code className="toast-code">{previewToast.code}</code>
            </span>
          </div>
          <button
            type="button"
            className="toast-paste-btn"
            onClick={handleAutofillCode}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Inséré !" : "Insérer le code"}</span>
          </button>
        </div>
      )}

      <div className="auth-clean-card">
        {/* STEPPER VISUEL ÉPURÉ (1 -> 2 -> 3) */}
        <div className="clean-stepper">
          <div className={`step-item ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
            <div className="step-circle">{step > 1 ? <Check size={14} /> : "1"}</div>
            <span>Coordonnées</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
            <div className="step-circle">{step > 2 ? <Check size={14} /> : "2"}</div>
            <span>Code OTP</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step === 3 ? "active" : ""}`}>
            <div className="step-circle">3</div>
            <span>Anti-Robot</span>
          </div>
        </div>

        {/* EN-TÊTE ÉPURÉ */}
        <div className="auth-clean-header">
          <h1>
            {step === 1 && "Connexion à CityFlow"}
            {step === 2 && "Vérification du code reçu"}
            {step === 3 && "Vérification de sécurité"}
          </h1>
          <p>
            {step === 1 && "Entrez votre nom et votre adresse e-mail ou numéro de téléphone pour recevoir un code d'authentification."}
            {step === 2 && `Saisissez le code à 6 chiffres envoyé à ${identifier} par ${channel === "whatsapp" ? "WhatsApp" : channel === "sms" ? "SMS" : "E-mail"}.`}
            {step === 3 && "Prouvez que vous êtes un utilisateur humain pour finaliser votre accès sécurisé."}
          </p>
        </div>

        {/* MESSAGES D'ALERTE */}
        {errorMessage && (
          <div className="clean-alert error">
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="clean-alert success">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* ÉTAPE 1 : NOM + EMAIL OU TÉLÉPHONE + CHOIX DU CANAL */}
        {/* ========================================================= */}
        {step === 1 && (
          <form className="clean-form" onSubmit={handleSendOtp}>
            <div className="clean-field">
              <label htmlFor="name-input">Nom complet</label>
              <div className="clean-input-wrap">
                <User size={18} className="field-icon" />
                <input
                  id="name-input"
                  type="text"
                  placeholder="Ex : Paule Noumbissi"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMessage("");
                  }}
                  required
                />
              </div>
            </div>

            <div className="clean-field">
              <label htmlFor="id-input">Adresse e-mail ou Numéro de téléphone</label>
              <div className="clean-input-wrap">
                {isEmail ? (
                  <Mail size={18} className="field-icon" />
                ) : (
                  <Phone size={18} className="field-icon" />
                )}
                <input
                  id="id-input"
                  type="text"
                  placeholder="ex: 699 00 11 22 ou nom@cityflow.cm"
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* SÉLECTION DU CANAL DE RÉCEPTION */}
            <div className="clean-field">
              <label>Canal de réception du code :</label>
              <div className="channel-tabs">
                <button
                  type="button"
                  className={`channel-btn ${channel === "whatsapp" ? "active whatsapp" : ""}`}
                  onClick={() => setChannel("whatsapp")}
                >
                  <MessageSquare size={16} />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  className={`channel-btn ${channel === "sms" ? "active sms" : ""}`}
                  onClick={() => setChannel("sms")}
                >
                  <Smartphone size={16} />
                  <span>SMS Direct</span>
                </button>

                <button
                  type="button"
                  className={`channel-btn ${channel === "email" ? "active email" : ""}`}
                  onClick={() => setChannel("email")}
                >
                  <Mail size={16} />
                  <span>E-mail</span>
                </button>
              </div>
            </div>

            <div className="clean-row-2">
              <div className="clean-field">
                <label htmlFor="role-select">Profil d'usage</label>
                <select
                  id="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="citizen">🚗 Citoyen / Conducteur</option>
                  <option value="emergency">🚑 Services d'Urgence (SAMU)</option>
                  <option value="traffic_manager">🚦 Régulateur Urbain (Mairie)</option>
                </select>
              </div>

              <div className="clean-field">
                <label htmlFor="city-select">Ville</label>
                <select
                  id="city-select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="Yaoundé">📍 Yaoundé</option>
                  <option value="Douala">📍 Douala</option>
                </select>
              </div>
            </div>

            <button type="submit" className="clean-submit-btn" disabled={isLoading}>
              <span>{isLoading ? "Envoi en cours..." : "Recevoir mon code de sécurité"}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* ÉTAPE 2 : SAISIE DU CODE OTP À 6 CHIFFRES */}
        {/* ========================================================= */}
        {step === 2 && (
          <form className="clean-form" onSubmit={handleVerifyOtpAndProceedToCaptcha}>
            <div className="otp-summary-card">
              <div className="summary-text">
                <small>Code expédié à</small>
                <strong>{identifier}</strong>
                <span className="channel-chip">{channel.toUpperCase()}</span>
              </div>
              <button
                type="button"
                className="summary-edit-btn"
                onClick={() => {
                  setStep(1);
                  setErrorMessage("");
                }}
              >
                <ChevronLeft size={14} /> Modifier
              </button>
            </div>

            <div className="clean-field">
              <label>Entrez les 6 chiffres reçus :</label>
              <div className="clean-otp-grid" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`clean-otp-box ${digit ? "filled" : ""}`}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e.key)}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            <div className="otp-timer-bar">
              <span className="timer-text">
                <RefreshCw size={13} className={isTimerActive ? "spin" : ""} />
                {isTimerActive
                  ? `Code valide : ${formatTimer(timerSeconds)}`
                  : "Code expiré"}
              </span>
              <button
                type="button"
                className="resend-link"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Renvoyer le code
              </button>
            </div>

            <button
              type="submit"
              className="clean-submit-btn"
              disabled={isLoading || otpDigits.some((d) => !d)}
            >
              <span>Continuer vers le test de sécurité</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* ÉTAPE 3 : TEST ANTI-ROBOT INTERACTIF (HUMAN VERIFICATION) */}
        {/* ========================================================= */}
        {step === 3 && (
          <div
            className="clean-form captcha-step"
            onMouseMove={handleSliderMouseMove}
            onMouseUp={handleSliderMouseUp}
            onTouchMove={handleSliderMouseMove}
            onTouchEnd={handleSliderMouseUp}
          >
            <div className="captcha-card">
              <div className="captcha-icon-wrap">
                {isCaptchaVerified ? (
                  <ShieldCheck size={36} color="#087f5b" />
                ) : (
                  <Bot size={36} color="#2563eb" />
                )}
              </div>

              <h3>{isCaptchaVerified ? "Humain vérifié avec succès !" : "Contrôle de sécurité anti-robot"}</h3>
              <p>
                {isCaptchaVerified
                  ? "Votre session est sécurisée. Connexion immédiate..."
                  : "Faites glisser le curseur entièrement vers la droite pour prouver que vous n'êtes pas un robot."}
              </p>

              {/* SLIDER INTERACTIF ANTI-ROBOT */}
              <div
                className={`slider-track ${isCaptchaVerified ? "verified" : ""}`}
                ref={sliderTrackRef}
              >
                <div
                  className="slider-progress"
                  style={{ width: `${sliderPosition}%` }}
                ></div>
                <div
                  className="slider-thumb"
                  style={{ left: `calc(${sliderPosition}% - ${sliderPosition * 0.4}px)` }}
                  onMouseDown={handleSliderMouseDown}
                  onTouchStart={handleSliderMouseDown}
                >
                  {isCaptchaVerified ? (
                    <Check size={20} color="#ffffff" />
                  ) : (
                    <ArrowRight size={20} color="#087f5b" />
                  )}
                </div>
                <span className="slider-label">
                  {isCaptchaVerified
                    ? "Vérification réussie ✓"
                    : "Glisser pour vérifier →"}
                </span>
              </div>
            </div>

            {/* BOUTON DE SECOURS EN CAS D'INTERACTION CLIC DIRECT */}
            {!isCaptchaVerified && (
              <button
                type="button"
                className="captcha-alt-btn"
                onClick={() => {
                  setIsCaptchaVerified(true);
                  setSliderPosition(100);
                  handleFinalSubmission();
                }}
              >
                <CheckCircle2 size={16} />
                <span>Cliquer pour valider immédiatement : Je ne suis pas un robot</span>
              </button>
            )}

            <button
              type="button"
              className="back-step-btn"
              onClick={() => {
                setStep(2);
                setSliderPosition(0);
                setIsCaptchaVerified(false);
              }}
            >
              <ChevronLeft size={14} /> Retour à la saisie du code
            </button>
          </div>
        )}

        {/* PIED DE PAGE ÉPURÉ */}
        <div className="auth-clean-footer">
          <Link to="/" className="clean-back-link">
            ← Retour à l'accueil CityFlow
          </Link>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;