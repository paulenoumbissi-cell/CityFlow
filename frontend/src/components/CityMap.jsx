import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CITIES, YAOUNDE_NODES, DOUALA_NODES, CongestionLevels, CITY_LANDMARKS } from "../data/cityData";
import { apiService } from "../services/api";
import { useCity } from "../context/CityContext";
import { useTheme } from "../context/ThemeContext";
import wsService from "../services/websocketService";
import {
  Navigation,
  Crosshair,
  MapPin,
  Radio,
  AlertCircle,
  Search,
  Layers,
  Hospital,
  Building,
  CheckCircle2,
  X,
  Compass,
  Tag,
  Eye,
  EyeOff,
} from "lucide-react";

const trafficStyles = {
  [CongestionLevels.JAMMED]: {
    color: "#dc2626",
    fillColor: "#dc2626",
    fillOpacity: 0.85,
    radius: 12,
    badgeText: "Saturé",
    badgeClass: "badge-dense",
  },
  [CongestionLevels.HEAVY]: {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.8,
    radius: 10,
    badgeText: "Dense",
    badgeClass: "badge-dense",
  },
  [CongestionLevels.MODERATE]: {
    color: "#f59e0b",
    fillColor: "#f59e0b",
    fillOpacity: 0.8,
    radius: 9,
    badgeText: "Modéré",
    badgeClass: "badge-moderate",
  },
  [CongestionLevels.FLUID]: {
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.8,
    radius: 8,
    badgeText: "Fluide",
    badgeClass: "badge-fluid",
  },
  dense: {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.8,
    radius: 10,
  },
  moderate: {
    color: "#f59e0b",
    fillColor: "#f59e0b",
    fillOpacity: 0.8,
    radius: 9,
  },
  fluid: {
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.8,
    radius: 8,
  },
};

// Création d'un badge DivIcon personnalisé pour afficher clairement le nom des zones
function createZoneDivIcon(name, congestion = "fluid", speed = null) {
  let statusClass = "fluid";
  if (congestion === CongestionLevels.JAMMED || congestion === CongestionLevels.HEAVY || congestion === "dense" || congestion === "jammed") {
    statusClass = "jammed";
  } else if (congestion === CongestionLevels.MODERATE || congestion === "moderate") {
    statusClass = "moderate";
  }

  const speedText = speed !== null ? `<span class="zone-district-speed">${speed} km/h</span>` : "";

  return L.divIcon({
    className: "zone-district-badge",
    html: `
      <div class="zone-district-pill">
        <span class="zone-status-dot ${statusClass}"></span>
        <span class="zone-district-name">${name}</span>
        ${speedText}
      </div>
    `,
    iconSize: [120, 26],
    iconAnchor: [60, 13],
  });
}

// Contrôleur de déplacement fluide de la caméra
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 13.5, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Gestionnaire de clics avec géocodage inverse
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([parseFloat(e.latlng.lat.toFixed(5)), parseFloat(e.latlng.lng.toFixed(5))]);
      }
    },
  });
  return null;
}

export default function CityMap({
  customRoute,
  height = "520px",
  onPointSelect,
  allowClickToSelect = true,
}) {
  const { selectedCity, setSelectedCity } = useCity();
  const { isDark } = useTheme();

  const [nodes, setNodes] = useState(selectedCity === "Douala" ? DOUALA_NODES : YAOUNDE_NODES);
  const [activeFilter, setActiveFilter] = useState("all");
  const [wsOnline, setWsOnline] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [clickedPoint, setClickedPoint] = useState(null);
  const [clickedAddress, setClickedAddress] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toLocaleTimeString());

  // Affichage des noms des zones & quartiers
  const [showZoneNames, setShowZoneNames] = useState(true);

  // Gestion des calques cartographiques (100% Gratuits et Sans Watermark)
  const [activeTileProvider, setActiveTileProvider] = useState(isDark ? "osmDark" : "osmFrance");
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Recherche & Autocomplétion API
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenterOverride, setMapCenterOverride] = useState(null);

  // Synchroniser le fournisseur de tuiles quand le thème sombre change
  useEffect(() => {
    if (activeTileProvider === "osmDark" || activeTileProvider === "osmFrance" || activeTileProvider === "osmStandard") {
      setActiveTileProvider(isDark ? "osmDark" : "osmFrance");
    }
  }, [isDark]);

  // Réinitialiser la recherche au changement de ville
  useEffect(() => {
    setSearchResults([]);
    setSearchQuery("");
    setSelectedPlace(null);
    setClickedPoint(null);
    setClickedAddress(null);
    setMapCenterOverride(null);
  }, [selectedCity]);

  // 1. Abonnement direct aux flux WebSocket temps réel (TRAFFIC_PULSE)
  useEffect(() => {
    let isMounted = true;

    const handleWsPulse = (data) => {
      if (!isMounted || !data || !data.nodes) return;
      if (data.city && data.city.toLowerCase() === selectedCity.toLowerCase()) {
        setNodes(data.nodes);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    };

    const unsubPulse = wsService.on("TRAFFIC_PULSE", handleWsPulse);
    const unsubStatus = wsService.onStatusChange((status) => {
      if (isMounted) setWsOnline(status === "connected");
    });

    apiService.getTrafficNodes(selectedCity).then((res) => {
      if (isMounted && res && res.nodes) {
        setNodes(res.nodes);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    });

    const fallbackInterval = setInterval(() => {
      if (wsService.status !== "connected") {
        apiService.getTrafficNodes(selectedCity).then((res) => {
          if (isMounted && res && res.nodes) {
            setNodes(res.nodes);
            setLastUpdateTime(new Date().toLocaleTimeString());
          }
        });
      }
    }, 4000);

    return () => {
      isMounted = false;
      unsubPulse();
      unsubStatus();
      clearInterval(fallbackInterval);
    };
  }, [selectedCity]);

  // 2. Recherche de lieu via /api/map/search (Nominatim + POIs Cameroun)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiService.searchMapPlaces(searchQuery, selectedCity);
        if (res && res.results) {
          setSearchResults(res.results);
        }
      } catch (err) {
        console.error("Erreur recherche carte :", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCity]);

  const handleSelectSearchResult = (place) => {
    setSelectedPlace(place);
    setMapCenterOverride([place.lat, place.lng]);
    setSearchResults([]);
    setSearchQuery(place.name);

    if (onPointSelect) {
      onPointSelect([place.lat, place.lng], place.name);
    }
  };

  // 3. Clic sur la carte avec géocodage inverse /api/map/reverse
  const handleMapClick = async (coords) => {
    setClickedPoint(coords);
    setSelectedPlace(null);
    setIsGeocoding(true);

    if (onPointSelect) {
      onPointSelect(coords);
    }

    try {
      const geoInfo = await apiService.reverseGeocode(coords[0], coords[1], selectedCity);
      setClickedAddress(geoInfo);
    } catch (e) {
      setClickedAddress(null);
    } finally {
      setIsGeocoding(false);
    }
  };

  // 4. Géolocalisation GPS du navigateur
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenterOverride(coords);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setGpsError("Impossible d'obtenir votre position GPS (autorisation refusée ou signal faible).");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  const currentCityConfig = selectedCity === "Douala" ? CITIES.Douala : CITIES.Yaounde;
  const activeCenter = mapCenterOverride || userLocation || currentCityConfig.center;

  // Liste consolidée des zones et quartiers majeurs pour la ville sélectionnée
  const cityZoneList = useMemo(() => {
    const list = [];
    const knownNames = new Set();

    // 1. Ajouter les nœuds de trafic principaux
    nodes.forEach((n) => {
      // Nettoyer le nom pour un affichage de zone compact (ex: "Carrefour Nlongkak" -> "Nlongkak")
      const cleanName = n.name.replace(/^(Carrefour|Rond-point|Marché|Échangeur d'|Boulevard de la Liberté \(|\))/gi, "").replace(/\(.*?\)/g, "").trim();
      list.push({
        id: n.id,
        name: cleanName || n.name,
        fullName: n.name,
        position: n.position,
        congestion: n.currentCongestion,
        speed: n.averageSpeedKmh,
        delay: n.estimatedDelayMinutes,
        isNode: true,
      });
      knownNames.add(cleanName.toLowerCase());
    });

    // 2. Ajouter les repères additionnels de la ville
    const landmarks = CITY_LANDMARKS[selectedCity] || [];
    landmarks.forEach((lm, idx) => {
      const cleanName = lm.name.replace(/^(Carrefour|Rond-point|Marché|Hôpital|Université de Yaoundé I \(|\))/gi, "").replace(/\(.*?\)/g, "").trim();
      if (!knownNames.has(cleanName.toLowerCase()) && lm.category === "landmark") {
        list.push({
          id: `lm_${idx}`,
          name: cleanName || lm.name,
          fullName: lm.name,
          position: lm.pos,
          congestion: "fluid",
          speed: null,
          delay: null,
          isNode: false,
        });
        knownNames.add(cleanName.toLowerCase());
      }
    });

    return list;
  }, [nodes, selectedCity]);

  const filteredNodes = nodes.filter((node) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "critical")
      return (
        node.currentCongestion === CongestionLevels.JAMMED ||
        node.currentCongestion === CongestionLevels.HEAVY ||
        node.currentCongestion === "dense"
      );
    if (activeFilter === "moderate")
      return (
        node.currentCongestion === CongestionLevels.MODERATE ||
        node.currentCongestion === "moderate"
      );
    if (activeFilter === "fluid")
      return (
        node.currentCongestion === CongestionLevels.FLUID ||
        node.currentCongestion === "fluid"
      );
    return true;
  });

  // Fonds de carte 100% Gratuits et Sans Clé API
  const tileProviders = {
    osmDark: {
      url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France (Mode Nuit Haute Définition)',
      label: "🌙 Mode Nuit (OSM Dark)",
      isDarkFilter: true,
    },
    osmFrance: {
      url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France (Noms des rues en Français)',
      label: "🇫🇷 Rues & Quartiers (OSM France)",
      isDarkFilter: false,
    },
    osmStandard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
      label: "🗺️ Standard (OpenStreetMap)",
      isDarkFilter: false,
    },
    esriStreet: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Sources: DeLorme, NAVTEQ, USGS",
      label: "🛣️ Esri Rues Urbaines",
      isDarkFilter: false,
    },
    esriSatellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, IGN",
      label: "🛰️ Satellite (Esri Imagery)",
      isDarkFilter: false,
    },
    openTopo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Style: OpenTopoMap',
      label: "⛰️ Relief & Collines (Topo)",
      isDarkFilter: false,
    },
  };

  const currentTile = tileProviders[activeTileProvider] || tileProviders.osmFrance;

  return (
    <div className={`city-map-wrapper ${currentTile.isDarkFilter ? "cityflow-dark-tiles" : ""}`}>
      {/* BARRE SUPÉRIEURE DE CONTRÔLE & RECHERCHE */}
      <div
        className="map-topbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span
            className="section-label"
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#00875A",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Compass size={13} />
            API CARTOGRAPHIQUE & SURVEILLANCE DES ZONES
          </span>
          <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: "700" }}>
            Quartiers & Trafic en Direct &bull; {selectedCity}
          </h2>
        </div>

        {/* RECHERCHE D'ADRESSE / CARREFOUR */}
        <div style={{ position: "relative", minWidth: "250px", flex: "1", maxWidth: "340px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: isDark ? "#1e293b" : "#ffffff",
              border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "6px 10px",
              gap: "8px",
            }}
          >
            <Search size={15} color={isDark ? "#94a3b8" : "#64748b"} />
            <input
              type="text"
              placeholder={`Rechercher un quartier (Bastos, Deido, Mokolo)...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: "inherit",
                fontSize: "13px",
                width: "100%",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 0,
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* LISTE DÉROULANTE DES RÉSULTATS DE RECHERCHE */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "4px",
                background: isDark ? "#1e293b" : "#ffffff",
                border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                borderRadius: "10px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                zIndex: 1000,
                maxHeight: "240px",
                overflowY: "auto",
              }}
            >
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => handleSelectSearchResult(res)}
                  style={{
                    padding: "8px 12px",
                    borderBottom: isDark ? "1px solid #334155" : "1px solid #f1f5f9",
                    cursor: "pointer",
                    fontSize: "12px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "#334155" : "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontWeight: "700", color: "#3B82F6", display: "flex", alignItems: "center", gap: "5px" }}>
                    <MapPin size={13} />
                    {res.name}
                  </div>
                  <div style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "11px", marginTop: "2px" }}>
                    {res.district} &bull; {res.source === "cityflow_core" ? "Repère CityFlow" : "OpenStreetMap"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOUTONS D'ACTION (NOMS DES ZONES, GPS, CALQUES, VILLE) */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* BOUTON BASCULE NOMS DES ZONES (QUARTIERS) */}
          <button
            onClick={() => setShowZoneNames(!showZoneNames)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 11px",
              background: showZoneNames ? (isDark ? "#1e3a8a" : "#eff6ff") : isDark ? "#1e293b" : "#f1f5f9",
              border: `1.5px solid ${showZoneNames ? "#3b82f6" : isDark ? "#334155" : "#cbd5e1"}`,
              borderRadius: "10px",
              color: showZoneNames ? "#2563eb" : "inherit",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            title="Afficher ou masquer les noms des zones et quartiers"
          >
            {showZoneNames ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{showZoneNames ? "Noms des zones" : "Zones masquées"}</span>
          </button>

          {/* MENU DES FONDS DE CARTE SANS WATERMARK */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 11px",
                background: isDark ? "#1e293b" : "#f1f5f9",
                border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
                borderRadius: "10px",
                color: "inherit",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
              title="Changer le calque cartographique (Rues, Nuit, Satellite, Topo)"
            >
              <Layers size={14} />
              <span>Calque</span>
            </button>

            {showLayerMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "6px",
                  background: isDark ? "#1e293b" : "#ffffff",
                  border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  zIndex: 1000,
                  minWidth: "220px",
                  padding: "6px 0",
                }}
              >
                {Object.entries(tileProviders).map(([key, provider]) => (
                  <div
                    key={key}
                    onClick={() => {
                      setActiveTileProvider(key);
                      setShowLayerMenu(false);
                    }}
                    style={{
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: activeTileProvider === key ? "700" : "500",
                      color: activeTileProvider === key ? "#2563EB" : "inherit",
                      background: activeTileProvider === key ? (isDark ? "rgba(37,99,235,0.15)" : "#eff6ff") : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{provider.label}</span>
                    {activeTileProvider === key && <CheckCircle2 size={14} color="#2563EB" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOUTON GPS */}
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 11px",
              background: userLocation ? "#e8f5e9" : isDark ? "#1e293b" : "#f1f5f9",
              border: `1px solid ${userLocation ? "#00875A" : isDark ? "#334155" : "#cbd5e1"}`,
              borderRadius: "10px",
              color: userLocation ? "#00875A" : "inherit",
              fontWeight: "600",
              fontSize: "12px",
              cursor: "pointer",
            }}
            title="Activer la position GPS réelle du navigateur"
          >
            <Crosshair size={14} className={isLocating ? "spin-icon" : ""} />
            <span>{isLocating ? "GPS..." : userLocation ? "GPS Actif" : "GPS"}</span>
          </button>

          {/* SÉLECTEUR DE VILLE */}
          <select
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            className="city-select"
            style={{
              padding: "7px 11px",
              borderRadius: "10px",
              border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
              fontWeight: "600",
              fontSize: "12px",
              background: isDark ? "#1e293b" : "#ffffff",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <option value="Yaoundé">📍 Yaoundé</option>
            <option value="Douala">📍 Douala</option>
          </select>
        </div>
      </div>

      {gpsError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={15} />
          <span>{gpsError}</span>
        </div>
      )}

      {/* CARTE LEAFLET */}
      <div
        className="real-map"
        style={{
          height,
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <MapContainer
          center={activeCenter}
          zoom={currentCityConfig.zoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeMapView center={activeCenter} zoom={selectedPlace ? 15 : currentCityConfig.zoom} />
          {allowClickToSelect && <MapClickHandler onMapClick={handleMapClick} />}

          {/* CALQUE DE TUILES 100% GRATUIT ET SANS WATERMARK */}
          <TileLayer
            key={`${activeTileProvider}_${selectedCity}`}
            url={currentTile.url}
            attribution={currentTile.attribution}
            maxZoom={19}
          />

          {/* ========================================================
              BADGES PROMINENTS DES NOMS DES ZONES & QUARTIERS
              ======================================================== */}
          {showZoneNames &&
            cityZoneList.map((zone) => (
              <Marker
                key={`zone_label_${zone.id}`}
                position={zone.position}
                icon={createZoneDivIcon(zone.name, zone.congestion, zone.speed)}
                eventHandlers={{
                  click: () => {
                    setMapCenterOverride(zone.position);
                    if (onPointSelect) {
                      onPointSelect(zone.position, zone.fullName);
                    }
                  },
                }}
              >
                <Popup>
                  <div style={{ padding: "4px", minWidth: "180px", color: "#0a2540" }}>
                    <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700" }}>
                      📍 {zone.fullName}
                    </h3>
                    {zone.speed !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                        <span>Vitesse actuelle :</span>
                        <strong style={{ color: "#00875A" }}>{zone.speed} km/h</strong>
                      </div>
                    )}
                    {zone.delay !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span>Retard estimé :</span>
                        <strong>+{zone.delay} min</strong>
                      </div>
                    )}
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                      Quartier de {selectedCity}, Cameroun
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* MARQUEUR DE RECHERCHE DE LIEU */}
          {selectedPlace && (
            <CircleMarker
              center={[selectedPlace.lat, selectedPlace.lng]}
              radius={11}
              pathOptions={{
                color: "#2563EB",
                fillColor: "#3B82F6",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <div style={{ padding: "4px", fontSize: "12px" }}>
                  <strong style={{ color: "#2563EB" }}>📍 {selectedPlace.name}</strong>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "11px" }}>
                    {selectedPlace.address || selectedPlace.district}
                  </p>
                  <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "10px" }}>
                    [{selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}]
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* MARQUEUR DE POSITION GPS RÉELLE */}
          {userLocation && (
            <>
              <CircleMarker
                center={userLocation}
                radius={22}
                pathOptions={{
                  color: "#2563EB",
                  fillColor: "#3B82F6",
                  fillOpacity: 0.2,
                  weight: 1.5,
                  className: "radar-marker-pulse",
                }}
              />
              <CircleMarker
                center={userLocation}
                radius={9}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#2563EB",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ padding: "4px", fontSize: "12px", color: "#1e293b" }}>
                    <strong>📍 Votre position GPS en direct</strong>
                    <div style={{ color: "#64748b", marginTop: "2px" }}>
                      Lat: {userLocation[0].toFixed(4)}, Lng: {userLocation[1].toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}

          {/* POINT CLIQUE SUR LA CARTE AVEC GÉOCODAGE INVERSE EN DIRECT */}
          {clickedPoint && (
            <CircleMarker
              center={clickedPoint}
              radius={9}
              pathOptions={{
                color: "#7C3AED",
                fillColor: "#8B5CF6",
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ padding: "4px", minWidth: "180px", fontSize: "12px" }}>
                  <strong style={{ color: "#7C3AED" }}>Point sélectionné</strong>
                  {isGeocoding ? (
                    <p style={{ margin: "4px 0", color: "#64748b", fontSize: "11px" }}>
                      ⏳ Géocodage de l'adresse en cours...
                    </p>
                  ) : clickedAddress ? (
                    <div style={{ marginTop: "4px" }}>
                      <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "12px" }}>
                        {clickedAddress.road || clickedAddress.district || "Voie urbaine"}
                      </div>
                      <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>
                        {clickedAddress.displayName}
                      </div>
                      {clickedAddress.nearestLandmark && (
                        <div style={{ color: "#00875A", fontSize: "10px", marginTop: "3px", fontWeight: "600" }}>
                          📍 À {clickedAddress.nearestLandmark.distanceMeters}m de {clickedAddress.nearestLandmark.name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ margin: "4px 0", color: "#64748b" }}>
                      [{clickedPoint[0]}, {clickedPoint[1]}]
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* TRACÉ D'ITINÉRAIRE PERSONNALISÉ OU D'URGENCE */}
          {customRoute && customRoute.coordinates && (
            <Polyline
              positions={customRoute.coordinates}
              pathOptions={{
                color: customRoute.color || "#00875A",
                weight: 6,
                opacity: 0.9,
              }}
            />
          )}

          {/* TRACÉ DES SEGMENTS CONNECTÉS */}
          {filteredNodes.map((node) =>
            node.connectedSegments && node.connectedSegments.length > 1 ? (
              <Polyline
                key={`segment_${node.id}`}
                positions={node.connectedSegments}
                pathOptions={{
                  color: (trafficStyles[node.currentCongestion] || trafficStyles[CongestionLevels.MODERATE]).color,
                  weight: 4,
                  opacity: 0.65,
                  dashArray:
                    node.currentCongestion === CongestionLevels.JAMMED || node.currentCongestion === "jammed"
                      ? "6, 6"
                      : undefined,
                }}
              />
            ) : null
          )}

          {/* MARQUEURS DES NŒUDS AVEC HALO RADAR */}
          {filteredNodes.map((node) => {
            const style =
              trafficStyles[node.currentCongestion] ||
              trafficStyles[CongestionLevels.MODERATE] ||
              trafficStyles.moderate;
            const isCritical =
              node.currentCongestion === CongestionLevels.JAMMED ||
              node.currentCongestion === CongestionLevels.HEAVY ||
              node.currentCongestion === "jammed";

            return (
              <div key={node.id}>
                {isCritical && (
                  <CircleMarker
                    center={node.position}
                    radius={style.radius ? style.radius + 8 : 18}
                    pathOptions={{
                      color: style.color,
                      fillColor: style.fillColor,
                      fillOpacity: 0.25,
                      weight: 1,
                      className: "radar-marker-pulse",
                    }}
                  />
                )}

                <CircleMarker
                  center={node.position}
                  radius={style.radius || 9}
                  pathOptions={{
                    color: style.color,
                    fillColor: style.fillColor,
                    fillOpacity: style.fillOpacity || 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div style={{ padding: "4px", minWidth: "190px", color: "#0a2540" }}>
                      <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700" }}>{node.name}</h3>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                        <span>Congestion :</span>
                        <strong>{node.congestionValue || node.value || 50}%</strong>
                      </div>
                      {node.averageSpeedKmh !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                          <span>Vitesse moyenne :</span>
                          <strong style={{ color: "#00875A" }}>{node.averageSpeedKmh} km/h</strong>
                        </div>
                      )}
                      {node.estimatedDelayMinutes !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                          <span>Retard estimé :</span>
                          <strong style={{ color: style.color }}>+{node.estimatedDelayMinutes} min</strong>
                        </div>
                      )}
                      {node.vehicleCountPerHour !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px", color: "#64748b" }}>
                          <span>Débit :</span>
                          <span>{node.vehicleCountPerHour} véh/h</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              </div>
            );
          })}
        </MapContainer>

        {/* LÉGENDE */}
        <div className="map-legend-real">
          <span>
            <i className="legend-green"></i>
            Fluide (&lt; 40%)
          </span>
          <span>
            <i className="legend-orange"></i>
            Modéré (40 - 75%)
          </span>
          <span>
            <i className="legend-red"></i>
            Dense / Saturé (&gt; 75%)
          </span>
        </div>

        {/* BADGE LIVE CLIGNOTANT AVEC HEURE REELLE */}
        <div
          className="map-live"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: wsOnline ? "rgba(16, 185, 129, 0.92)" : "rgba(30, 41, 59, 0.9)",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            backdropFilter: "blur(6px)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#ffffff",
              animation: "pulseDot 1.2s infinite",
            }}
          ></span>
          <span>{wsOnline ? `FLUX LIVE TEMPS RÉEL (${lastUpdateTime})` : `MODE LOCAL (${lastUpdateTime})`}</span>
        </div>
      </div>
    </div>
  );
}