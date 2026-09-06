import { useState } from "react";
import { 
  Bell, 
  Moon, 
  Sun,
  MapPin, 
  Shield, 
  Smartphone, 
  Globe, 
  Check, 
  ChevronRight 
} from "lucide-react";
import { useCity } from "../context/CityContext";
import { useTheme } from "../context/ThemeContext";
import "./SettingsPage.css";

function SettingsPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const { theme, toggleTheme, isDark } = useTheme();
  const [trafficAlerts, setTrafficAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoReroute, setAutoReroute] = useState(true);

  return (
    <main className="settings-page">
      <div className="settings-container">

        {/* HEADER */}
        <div className="settings-header">
          <div>
            <span className="settings-label">CONFIGURATION</span>
            <h1>Paramètres</h1>
            <p>Personnalisez vos alertes, votre affichage et vos préférences de navigation.</p>
          </div>
        </div>

        <div className="settings-sections">

          {/* SECTION : NAVIGATION & MOBILITÉ */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-box">
                <MapPin size={20} />
              </div>
              <div>
                <h2>Navigation & Ville</h2>
                <span>Définissez vos priorités de déplacement</span>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-item">
                <div>
                  <strong>Ville par défaut</strong>
                  <span>Ville chargée automatiquement sur la carte</span>
                </div>
                <select 
                  value={selectedCity} 
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="settings-select"
                >
                  <option value="Yaoundé">Yaoundé</option>
                  <option value="Douala">Douala</option>
                </select>
              </div>

              <div className="settings-item">
                <div>
                  <strong>Recalcul automatique d'itinéraire</strong>
                  <span>Proposer un détour si un bouchon survient en cours de route</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={autoReroute} 
                    onChange={(e) => setAutoReroute(e.target.checked)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* SECTION : NOTIFICATIONS & ALERTES */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-box">
                <Bell size={20} />
              </div>
              <div>
                <h2>Alertes & Notifications</h2>
                <span>Gérez la fréquence et le mode de vos alertes</span>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-item">
                <div>
                  <strong>Alertes trafic critique</strong>
                  <span>Recevoir une alerte si une zone dépasse 80% de congestion</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={trafficAlerts} 
                    onChange={(e) => setTrafficAlerts(e.target.checked)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div>
                  <strong>Alertes sonores</strong>
                  <span>Émettre un son lors d'un incident majeur</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={soundEnabled} 
                    onChange={(e) => setSoundEnabled(e.target.checked)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* SECTION : AFFICHAGE & APPLICATION */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-box">
                {isDark ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <h2>Affichage & Thème</h2>
                <span>Ajustez l'apparence de CityFlow</span>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-item">
                <div>
                  <strong>Mode sombre (Thème Nuit)</strong>
                  <span>{isDark ? "Thème sombre activé pour un confort de conduite de nuit" : "Adapter l'interface en mode sombre pour la conduite de nuit"}</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={isDark} 
                    onChange={toggleTheme} 
                    aria-label="Basculer le mode sombre"
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="settings-item clickable">
                <div>
                  <strong>Langue de l'interface</strong>
                  <span>Français (Cameroun)</span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </div>
          </section>

          {/* SECTION : COMPTE & SÉCURITÉ */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-box">
                <Shield size={20} />
              </div>
              <div>
                <h2>Confidentialité & Données</h2>
                <span>Gestion de l'historique et des accès</span>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-item">
                <div>
                  <strong>Partage de position GPS</strong>
                  <span>Permet d'estimer avec précision vos temps de trajet</span>
                </div>
                <span className="badge-status">Autorisé</span>
              </div>

              <div className="settings-item danger-zone">
                <div>
                  <strong>Effacer l'historique des trajets</strong>
                  <span>Supprime les données locales de vos déplacements récents</span>
                </div>
                <button className="btn-danger-outline">Effacer</button>
              </div>
            </div>
          </section>

        </div>

      </div>
    </main>
  );
}

export default SettingsPage;