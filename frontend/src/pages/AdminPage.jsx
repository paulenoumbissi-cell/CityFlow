import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle, XCircle, UserPlus, Users, Activity, AlertTriangle, MapPin, BarChart3, Clock, Mail, Lock, User, Loader } from "lucide-react";
import apiService from "../services/api";
import "./AdminPage.css";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("traffic");
  
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [adminStatus, setAdminStatus] = useState(null);

  // Accreditations State
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for Traffic & Incidents
  const [incidents, setIncidents] = useState([
    { id: 1, type: "Accident", location: "Carrefour Ndokoti", reporter: "Paul", status: "pending", time: "Il y a 10 min" },
    { id: 2, type: "Travaux", location: "Poste Centrale", reporter: "Marie", status: "pending", time: "Il y a 25 min" },
    { id: 3, type: "Inondation", location: "Avenue Kennedy", reporter: "Jean", status: "pending", time: "Il y a 1h" }
  ]);

  const trafficStats = [
    { label: "Congestion Moyenne", value: "65%", status: "warning" },
    { label: "Véhicules Actifs", value: "1,245", status: "good" },
    { label: "Alertes Critiques", value: "3", status: "danger" }
  ];

  const handleResolveIncident = (id) => {
    setIncidents(incidents.filter(i => i.id !== id));
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await apiService.getPendingAdminUsers();
    if (data?.success) {
      setPendingUsers(data.users || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeTab === "accreditations") {
      fetchUsers();
    }
  }, [activeTab]);

  const handleApprove = async (id) => {
    const res = await apiService.approveAdminUser(id);
    if (res?.success) {
      fetchUsers();
    }
  };

  const handleReject = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir rejeter cette accréditation ?")) {
      const res = await apiService.rejectAdminUser(id);
      if (res?.success) {
        fetchUsers();
      }
    }
  };

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    if (newAdmin.name && newAdmin.email && newAdmin.password) {
      setAdminStatus("success");
      setNewAdmin({ name: '', email: '', password: '' });
      setTimeout(() => setAdminStatus(null), 3000);
    } else {
      setAdminStatus("error");
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-header glass-panel">
        <div className="admin-header-title">
          <ShieldAlert size={32} color="#3b82f6" />
          <div>
            <h1>Tableau de Bord Administrateur</h1>
            <p>Supervision globale du réseau CityFlow</p>
          </div>
        </div>
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'traffic' ? 'active' : ''}`}
            onClick={() => setActiveTab('traffic')}
          >
            <Activity size={18} /> Trafic
          </button>
          <button 
            className={`admin-tab ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            <Users size={18} /> Comptes & Accès
            {pendingUsers.length > 0 && <span className="admin-badge">{pendingUsers.length}</span>}
          </button>
          <button 
            className={`admin-tab ${activeTab === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            <AlertTriangle size={18} /> Incidents
            {incidents.length > 0 && <span className="admin-badge danger">{incidents.length}</span>}
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* TAB: TRAFFIC */}
        {activeTab === "traffic" && (
          <div className="admin-section fade-in">
            <h2>Vue d'ensemble du Trafic</h2>
            <div className="traffic-stats-grid">
              {trafficStats.map((stat, i) => (
                <div key={i} className={`traffic-stat-card glass-panel ${stat.status}`}>
                  <BarChart3 size={24} className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="admin-map-placeholder glass-panel">
              <MapPin size={48} color="#94a3b8" />
              <p>Carte de supervision en direct</p>
              <span>(Intégration flux temps réel)</span>
            </div>
          </div>
        )}

        {/* TAB: COMPTES & ACCÈS (Fusion de Créer Admin & Accréditations) */}
        {activeTab === "accounts" && (
          <div className="admin-section fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            {/* SECTION: ACCRÉDITATIONS EN ATTENTE */}
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} className="text-blue-500" /> 
                Demandes d'accréditation (Urgences)
              </h2>
              {isLoading ? (
                <div className="admin-loading">
                  <Loader size={32} className="spin" />
                  <p>Chargement des demandes...</p>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="admin-empty glass-panel" style={{ padding: "30px 20px" }}>
                  <CheckCircle size={40} color="#10b981" />
                  <h3 style={{ fontSize: "18px", margin: "12px 0 6px" }}>Tout est à jour !</h3>
                  <p>Aucune demande d'accréditation en attente.</p>
                </div>
              ) : (
                <div className="admin-table-container glass-panel">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Service / Conducteur</th>
                        <th>Contact</th>
                        <th>Rôle</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="admin-user-cell">
                              <div className="admin-avatar">{u.name.substring(0,2).toUpperCase()}</div>
                              <div className="admin-user-info">
                                <strong>{u.name}</strong>
                                <span>{u.username}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="admin-contact">
                              <span>{u.email}</span>
                              <span>{u.phone}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`admin-role-badge ${u.role}`}>{u.role_label}</span>
                          </td>
                          <td>{new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            <div className="admin-actions">
                              <button className="admin-btn-approve" onClick={() => handleApprove(u.id)} title="Approuver"><CheckCircle size={16} /></button>
                              <button className="admin-btn-reject" onClick={() => handleReject(u.id)} title="Rejeter"><XCircle size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--cityflow-border)', margin: '0 16px' }} />

            {/* SECTION: CRÉER ADMINISTRATEUR */}
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} className="text-blue-500" />
                Créer un nouvel Administrateur
              </h2>
              <div className="admin-form-container glass-panel" style={{ maxWidth: '600px', padding: '24px', borderRadius: '12px' }}>
                <p style={{ color: "var(--cityflow-muted)", marginBottom: "20px", fontSize: "14px" }}>
                  Ajoutez un compte doté des droits d'administration (Onde Verte, Gestion Trafic).
                </p>
                
                {adminStatus === "success" && (
                  <div style={{ background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle size={18} /> Administrateur créé avec succès !
                  </div>
                )}
                {adminStatus === "error" && (
                  <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertTriangle size={18} /> Veuillez remplir tous les champs.
                  </div>
                )}

                <form onSubmit={handleCreateAdmin} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontWeight: 600, fontSize: "13px", color: "var(--cityflow-text)" }}>Nom complet</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '10px' }}>
                      <User size={16} style={{ color: "var(--cityflow-muted)", marginRight: "8px" }} />
                      <input 
                        type="text" 
                        placeholder="Jean Dupont" 
                        value={newAdmin.name} 
                        onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--cityflow-text)', fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontWeight: 600, fontSize: "13px", color: "var(--cityflow-text)" }}>Adresse E-mail</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '10px' }}>
                      <Mail size={16} style={{ color: "var(--cityflow-muted)", marginRight: "8px" }} />
                      <input 
                        type="email" 
                        placeholder="admin@cityflow.com" 
                        value={newAdmin.email} 
                        onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--cityflow-text)', fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, fontSize: "13px", color: "var(--cityflow-text)" }}>Mot de passe temporaire</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '10px' }}>
                      <Lock size={16} style={{ color: "var(--cityflow-muted)", marginRight: "8px" }} />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newAdmin.password} 
                        onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--cityflow-text)', fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    style={{ 
                      gridColumn: '1 / -1',
                      marginTop: '4px', 
                      background: 'var(--cityflow-primary)', 
                      color: 'white', 
                      border: 'none', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <UserPlus size={16} /> Enregistrer l'Administrateur
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}



        {/* TAB: INCIDENTS */}
        {activeTab === "incidents" && (
          <div className="admin-section fade-in">
            <h2>Incidents signalés par la communauté</h2>
            {incidents.length === 0 ? (
              <div className="admin-empty glass-panel">
                <CheckCircle size={48} color="#10b981" />
                <h3>Réseau fluide</h3>
                <p>Aucun incident en cours de traitement.</p>
              </div>
            ) : (
              <div className="admin-table-container glass-panel">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Localisation</th>
                      <th>Signalé par</th>
                      <th>Temps écoulé</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map(inc => (
                      <tr key={inc.id}>
                        <td>
                          <div className="incident-type">
                            <AlertTriangle size={16} className="text-orange" />
                            <strong>{inc.type}</strong>
                          </div>
                        </td>
                        <td>{inc.location}</td>
                        <td>{inc.reporter}</td>
                        <td>
                          <div className="incident-time">
                            <Clock size={14} />
                            <span>{inc.time}</span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button className="admin-btn-approve" onClick={() => handleResolveIncident(inc.id)}>
                              <CheckCircle size={18} /> Traiter
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}

