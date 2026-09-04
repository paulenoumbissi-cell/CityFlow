import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, updateUserProfile, sendOtp, verifyOtp, resendOtp } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("cityflow_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Utilisateur initial par défaut
    return {
      id: "usr_001",
      name: "Paule Noumbissi",
      email: "conducteur@cityflow.cm",
      phone: "+237 699 00 11 22",
      phoneVerified: true,
      authChannel: "whatsapp",
      role: "citizen",
      roleLabel: "Conducteur / Citoyen",
      city: "Yaoundé",
      vehicleType: "Voiture particulière",
      initials: "PN",
      isAuthenticated: true,
      tripsCount: 47,
      timeSavedMin: 184,
      co2SavedKg: 14.2,
      score: 92,
      token: "jwt_cityflow_demo_default",
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
  const verifyOtpCode = async ({ identifier, phone, email, code, channel, name, role, city, vehicleType }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await verifyOtp({ identifier, phone, email, code, channel, name, role, city, vehicleType });
      if (res && res.user) {
        const names = (res.user.name || "Utilisateur").trim();
        const parts = names.split(" ");
        const initials = parts.length > 1
          ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
          : names.slice(0, 2).toUpperCase();

        const fullUser = {
          ...res.user,
          phone: res.user.phone || phone || "+237 699 00 11 22",
          email: res.user.email || email || "conducteur@cityflow.cm",
          phoneVerified: true,
          authChannel: channel || res.user.channel || "whatsapp",
          initials,
          isAuthenticated: true,
          token: res.token || res.user.token,
          tripsCount: user?.tripsCount || 1,
          timeSavedMin: user?.timeSavedMin || 15,
          co2SavedKg: user?.co2SavedKg || 1.2,
          score: user?.score || 95,
        };

        setUser(fullUser);
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
        const names = (res.user.name || res.user.email.split("@")[0]).trim();
        const parts = names.split(" ");
        const initials = parts.length > 1
          ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
          : names.slice(0, 2).toUpperCase();

        const fullUser = {
          ...res.user,
          initials,
          isAuthenticated: true,
          token: res.token || res.user.token,
        };

        setUser(fullUser);
        setIsLoading(false);
        return { success: true, user: fullUser };
      }
      throw new Error("Réponse serveur invalide");
    } catch (err) {
      setError(err.message || "Erreur d'authentification");
      setIsLoading(false);
      throw err;
    }
  };

  // Inscription email via le backend
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await registerUser(userData);
      if (res && res.user) {
        const names = (res.user.name || res.user.email.split("@")[0]).trim();
        const parts = names.split(" ");
        const initials = parts.length > 1
          ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
          : names.slice(0, 2).toUpperCase();

        const fullUser = {
          ...res.user,
          initials,
          isAuthenticated: true,
          token: res.token || res.user.token,
        };

        setUser(fullUser);
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

  // Mise à jour du profil
  const updateProfile = async (profileData) => {
    setIsLoading(true);
    try {
      const res = await updateUserProfile({
        email: user?.email,
        phone: user?.phone,
        ...profileData,
      });
      if (res && res.user) {
        const updated = {
          ...user,
          ...res.user,
        };
        setUser(updated);
        setIsLoading(false);
        return { success: true, user: updated };
      }
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
        isAuthenticated: !!user?.isAuthenticated,
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

