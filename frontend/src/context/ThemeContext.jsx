import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 1. Récupérer le thème initial depuis localStorage ou la préférence système
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("cityflow_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    } catch (e) {
      console.warn("Erreur lecture thème:", e);
    }
    return "light";
  });

  // 2. Mettre à jour le DOM et le stockage lors du changement
  useEffect(() => {
    try {
      localStorage.setItem("cityflow_theme", theme);
      const root = document.documentElement;
      root.setAttribute("data-theme", theme);
      if (theme === "dark") {
        root.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        root.classList.remove("dark");
        document.body.classList.remove("dark");
      }
    } catch (e) {
      console.warn("Erreur application thème:", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider");
  }
  return context;
}

export default ThemeContext;
