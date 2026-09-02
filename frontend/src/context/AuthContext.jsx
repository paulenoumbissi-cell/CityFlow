import { createContext, useContext, useState, useEffect } from "react";

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
    // Default mock user for demo
    return {
      name: "Paule Noumbissi",
      email: "paulenoumbissi@gmail.com",
      role: "Utilisateur CityFlow",
      city: "Yaoundé",
      initials: "PN",
      isAuthenticated: true,
      tripsCount: 47,
      timeSavedMin: 184,
      score: 92,
    };
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("cityflow_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cityflow_user");
    }
  }, [user]);

  const login = (userData) => {
    const names = (userData.name || userData.email.split("@")[0]).trim();
    const parts = names.split(" ");
    const initials = parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : names.slice(0, 2).toUpperCase();

    const newUser = {
      name: userData.name || names,
      email: userData.email,
      role: "Utilisateur CityFlow",
      city: userData.city || "Yaoundé",
      initials: initials || "CF",
      isAuthenticated: true,
      tripsCount: 1,
      timeSavedMin: 12,
      score: 85,
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user?.isAuthenticated,
        login,
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
