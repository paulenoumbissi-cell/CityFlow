import { useState, useEffect } from "react";
import { BrainCircuit, Database, Cpu, Activity, Play, CheckCircle, RefreshCcw, ShieldAlert, BarChart3, TrendingUp, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./AiTrainingPage.css";

const API_URL = "http://localhost:3000/api/ai/train";

function AiTrainingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [logs, setLogs] = useState([]);
  const [newWeights, setNewWeights] = useState([]);
  
  const totalEpochs = 50;

  useEffect(() => {
    if (!user || user.role !== "traffic_manager") {
      navigate("/");
    }
  }, [user, navigate]);

  const startTraining = async () => {
    setIsTraining(true);
    setTrainingComplete(false);
    setProgress(0);
    setCurrentEpoch(0);
    setLogs([]);
    setNewWeights([]);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epochs: totalEpochs, datasetSize: 12540 })
      });
      
      const data = await response.json();
      
      // Simulate real-time logs using the backend data
      if (data.status === "success") {
        simulateProgress(data.trainingLogs, data.updatedWeights);
      } else {
        alert("Erreur lors de la communication avec le cluster IA.");
        setIsTraining(false);
      }
    } catch (err) {
      alert("Erreur réseau: Impossible de contacter le serveur d'entraînement.");
      setIsTraining(false);
    }
  };

  const simulateProgress = (backendLogs, finalWeights) => {
    let epochCounter = 0;
    
    const interval = setInterval(() => {
      if (epochCounter >= backendLogs.length) {
        clearInterval(interval);
        setIsTraining(false);
        setTrainingComplete(true);
        setNewWeights(finalWeights);
        return;
      }
      
      const currentLog = backendLogs[epochCounter];
      setLogs(prev => [currentLog, ...prev].slice(0, 8)); // keep last 8 logs visible
      setCurrentEpoch(currentLog.epoch);
      setProgress(Math.round((currentLog.epoch / totalEpochs) * 100));
      
      epochCounter++;
    }, 120); // 120ms per epoch for visual effect
  };

  return (
    <main className="ai-training-page">
      <div className="training-header">
        <div className="header-title">
          <div className="icon-box pulse">
            <BrainCircuit size={28} color="#2563eb" />
          </div>
          <div>
            <h1>CityFlow Neural Engine</h1>
            <p>Console d'entraînement et d'ajustement heuristique (Système Expert)</p>
          </div>
        </div>
        <div className="header-status">
          <span className={`status-badge ${isTraining ? "training" : "idle"}`}>
            {isTraining ? <><RefreshCcw size={14} className="spin" /> Entraînement en cours...</> : "Cluster Prêt"}
          </span>
        </div>
      </div>

      <div className="training-dashboard-grid">
        
        {/* COLONNE GAUCHE: DATASET & CONTROLES */}
        <div className="dashboard-left">
          <div className="ds-card data-sources-card">
            <h3><Database size={18} /> Sources de Données (Phase 2)</h3>
            <p className="ds-desc">Le modèle va ingérer les données historiques et réelles pour ajuster ses multiplicateurs de congestion.</p>
            
            <ul className="data-list">
              <li>
                <span className="data-icon">📍</span>
                <div>
                  <strong>Télémétrie GPS (Crowdsourcing)</strong>
                  <span>8 420 trajets anonymisés collectés.</span>
                </div>
              </li>
              <li>
                <span className="data-icon">🌧️</span>
                <div>
                  <strong>Historique Météorologique</strong>
                  <span>Croisement avec 45 épisodes pluvieux.</span>
                </div>
              </li>
              <li>
                <span className="data-icon">🚨</span>
                <div>
                  <strong>Signalements Communautaires</strong>
                  <span>1 245 incidents confirmés par les citoyens.</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="ds-card control-card">
            <h3><Settings size={18} /> Paramètres d'hyper-optimisation</h3>
            <div className="param-row">
              <label>Taux d'apprentissage (Learning Rate)</label>
              <input type="text" value="0.015" disabled />
            </div>
            <div className="param-row">
              <label>Nombre d'Epochs (Itérations)</label>
              <input type="text" value={totalEpochs} disabled />
            </div>
            
            <button 
              className={`btn-start-training ${isTraining ? "disabled" : ""}`} 
              onClick={startTraining}
              disabled={isTraining}
            >
              {isTraining ? (
                <><Cpu size={18} className="pulse-icon" /> Compilation du Modèle...</>
              ) : (
                <><Play size={18} /> Lancer l'entraînement (Epochs : {totalEpochs})</>
              )}
            </button>
          </div>
        </div>

        {/* COLONNE DROITE: CONSOLE LOGS & RÉSULTATS */}
        <div className="dashboard-right">
          <div className="ds-card console-card">
            <h3><Activity size={18} /> Console du Serveur IA</h3>
            
            <div className="progress-container">
              <div className="progress-labels">
                <span>Progression : {progress}%</span>
                <span>Epoch {currentEpoch} / {totalEpochs}</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="terminal-window">
              <div className="terminal-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
                <span className="terminal-title">bash - cityflow-ai-cluster</span>
              </div>
              <div className="terminal-body">
                {logs.length === 0 && !isTraining && !trainingComplete && (
                  <div className="log-line">En attente de démarrage...</div>
                )}
                {logs.map((log, idx) => (
                  <div key={idx} className="log-line">
                    <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                    <span className="log-info">Epoch {log.epoch.toString().padStart(2, '0')}/{totalEpochs}</span>
                    <span className="log-metric">loss: <span style={{color: '#f87171'}}>{log.loss.toFixed(4)}</span></span>
                    <span className="log-metric">accuracy: <span style={{color: '#4ade80'}}>{(log.accuracy * 100).toFixed(1)}%</span></span>
                  </div>
                ))}
                {trainingComplete && (
                  <div className="log-line success">
                    <CheckCircle size={14} /> Entraînement terminé avec succès. Poids synaptiques mis à jour.
                  </div>
                )}
              </div>
            </div>
          </div>

          {trainingComplete && newWeights.length > 0 && (
            <div className="ds-card results-card slide-up">
              <h3><TrendingUp size={18} /> Nouveaux Poids Algorithmiques</h3>
              <p className="ds-desc">Le modèle heuristique a ajusté ses multiplicateurs suite à l'apprentissage.</p>
              
              <div className="weights-grid">
                {newWeights.map((w, idx) => (
                  <div className="weight-item" key={idx}>
                    <div className="weight-name">
                      {w.factor === "heavy_rain_congestion" && "Impact Pluie Forte"}
                      {w.factor === "market_day_speed" && "Vitesse Jour de Marché"}
                      {w.factor === "evening_peak_multiplier" && "Pic Vespéral"}
                    </div>
                    <div className="weight-values">
                      <span className="old-w">{w.oldWeight.toFixed(2)}x</span>
                      <span className="arrow">→</span>
                      <span className="new-w">{w.newWeight.toFixed(2)}x</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="deployment-alert">
                <ShieldAlert size={16} />
                <span>Ces nouveaux poids seront actifs sur les prochaines requêtes de prédiction.</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

export default AiTrainingPage;
