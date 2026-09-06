import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, updateUserProfile, sendOtp, verifyOtp, resendOtp } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("cityflow_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Utilisateur initial connecté par défaut pour navigation fluide
    return {
      id: "usr_current",
      name: "Paul Enoumbissi",
      username: "paul_237",
      email: "paul.enoumbissi@cityflow.cm",
      phone: "+237699123456",
      bio: "Conducteur quotidien engagé pour une mobilité fluide à Yaoundé et Douala.",
      avatar: null,
      phoneVerified: true,
      authChannel: "whatsapp",
      role: "citizen",
      roleLabel: "Conducteur / Citoyen",
      city: "Yaoundé",
      vehicleType: "Voiture particulière",
      initials: "PE",
      isAuthenticated: true,
      tripsCount: 47,
      timeSavedMin: 184,
      co2SavedKg: 14.2,
      points: 380,
      trustScore: 85,
      score: 85,
      token: "jwt_cityflow_default",
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem("cityflow_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cityflow_user");
    }
  }, [user]);

  // Helper pour calculer les initiales
  const getInitials = (name) => {
    const clean = (name || "Citoyen").trim();
    const parts = clean.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : clean.slice(0, 2).toUpperCase();
  };

  // Envoi du code OTP via WhatsApp, SMS ou E-mail
  const sendOtpCode = async ({ identifier, phone, email, channel = "whatsapp", name, role, city, vehicleType }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await sendOtp({ identifier, phone, email, channel, name, role, city, vehicleType });
      setIsLoading(false);
      return res;
    } catch (err) {
      setError(err.message || "Erreur d'envoi du code OTP");
      setIsLoading(false);
      throw err;
    }
  };

  // Validation du code OTP
  const verifyOtpCode = async ({ identifier, phone, email, code, channel, name, password, role, city, vehicleType }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await verifyOtp({ identifier, phone, email, code, channel, name, password, role, city, vehicleType });
      if (res && res.user) {
        const fullUser = {
          ...res.user,
          initials: getInitials(res.user.name),
          isAuthenticated: true,
          token: res.token || res.user.token,
          score: res.user.trustScore || 85,
        };

        setUser(fullUser);
        localStorage.setItem("cityflow_user", JSON.stringify(fullUser));
        setIsLoading(false);
        return { success: true, user: fullUser, message: res.message };
      }
      throw new Error("Réponse serveur invalide");
    } catch (err) {
      setError(err.message || "Erreur de validation du code OTP");
      setIsLoading(false);
      throw err;
    }
  };

  // Renvoi du code OTP
  const resendOtpCode = async ({ identifier, phone, email, channel }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await resendOtp({ identifier, phone, email, channel });
      setIsLoading(false);
      return res;
    } catch (err) {
      setError(err.message || "Erreur de renvoi du code");
      setIsLoading(false);
      throw err;
    }
  };

  // Connexion email classique via le backend
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginUser(email, password);
      if (res && res.user) {
        const fullUser = {
          ...res.user,
          initials: getInitials(res.user.name),
          isAuthenticated: true,
          token: res.token || res.user.token,
          score: res.user.trustScore || 85,
        };

        setUser(fullUser);
        localStorage.setItem("cityflow_user", JSON.stringify(fullUser));
        setIsLoading(false);
        return { success: true, user: fullUser };
      }
      throw new Error("Réponse serveur invalide");
    } catch (err) {
      setError(err.message || "Identifiant ou mot de passe incorrect.");
      setIsLoading(false);
      throw err;
    }
  };

  // Inscription obligatoire avec email et mot de passe enregistrés
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await registerUser(userData);
      if (res && res.user) {
        const fullUser = {
          ...res.user,
          initials: getInitials(res.user.name),
          isAuthenticated: true,
          token: res.token || res.user.token,
          score: res.user.trustScore || 85,
        };

        setUser(fullUser);
        localStorage.setItem("cityflow_user", JSON.stringify(fullUser));
        setIsLoading(false);
        return { success: true, user: fullUser };
      }
      throw new Error("Erreur lors de l'enregistrement");
    } catch (err) {
      setError(err.message || "Erreur d'inscription");
      setIsLoading(false);
      throw err;
    }
  };

  // Mise à jour permanente du profil
  const updateProfile = async (profileData) => {
    setIsLoading(true);
    try {
      const newName = profileData.name || user?.name || "Utilisateur";
      let updatedUser = {
        ...user,
        ...profileData,
        initials: getInitials(newName),
      };

      try {
        const res = await updateUserProfile({
          email: user?.email,
          phone: user?.phone,
          ...profileData,
        });
        if (res && res.user) {
          updatedUser = {
            ...updatedUser,
            ...res.user,
            initials: getInitials(res.user.name),
          };
        }
      } catch (apiErr) {
        console.warn("[CityFlow] Backend update fallback to local state:", apiErr);
      }

      setUser(updatedUser);
      localStorage.setItem("cityflow_user", JSON.stringify(updatedUser));
      setIsLoading(false);
      return { success: true, user: updatedUser };
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cityflow_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!user?.isAuthenticated,
        role: user?.role || "citizen",
        roleLabel: user?.roleLabel || "Conducteur / Citoyen",
        isLoading,
        error,
        sendOtpCode,
        verifyOtpCode,
        resendOtpCode,
        login,
        register,
        updateProfile,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
