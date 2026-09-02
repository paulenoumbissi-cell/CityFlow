import { createContext, useContext, useState, useEffect } from "react";

const CityContext = createContext();

export const cityCoordinates = {
  Yaoundé: {
    name: "Yaoundé",
    position: [3.848, 11.502],
    zoom: 13,
    landmarks: [
      { name: "Poste Centrale", position: [3.8667, 11.5167] },
      { name: "Bastos", position: [3.889, 11.512] },
      { name: "Mvan (Gare)", position: [3.822, 11.523] },
      { name: "Nsam", position: [3.829, 11.511] },
      { name: "Nlongkak", position: [3.890, 11.522] },
      { name: "Mokolo", position: [3.873, 11.503] },
      { name: "Odza", position: [3.799, 11.523] },
      { name: "Ahala", position: [3.785, 11.505] },
      { name: "Hôpital Général", position: [3.898, 11.543] },
      { name: "Hôpital Central (CHU)", position: [3.865, 11.508] },
    ],
  },
  Douala: {
    name: "Douala",
    position: [4.0511, 9.7679],
    zoom: 13,
    landmarks: [
      { name: "Akwa", position: [4.0511, 9.7043] },
      { name: "Deido (Rond-point)", position: [4.0667, 9.7006] },
      { name: "Bonanjo", position: [4.043, 9.691] },
      { name: "Bonabéri", position: [4.0714, 9.6712] },
      { name: "Bépanda", position: [4.047, 9.727] },
      { name: "Bonamoussadi", position: [4.0867, 9.735] },
      { name: "Logbessou", position: [4.105, 9.776] },
      { name: "Hôpital Laquintinie", position: [4.055, 9.702] },
      { name: "Hôpital Général de Douala", position: [4.062, 9.748] },
    ],
  },
};

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem("cityflow_city") || "Yaoundé";
  });

  useEffect(() => {
    localStorage.setItem("cityflow_city", selectedCity);
  }, [selectedCity]);

  const currentCityData = cityCoordinates[selectedCity] || cityCoordinates["Yaoundé"];

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        currentCityData,
        cities: Object.keys(cityCoordinates),
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
}
