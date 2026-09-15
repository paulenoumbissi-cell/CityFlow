import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle, XCircle, Users, Activity, Loader } from "lucide-react";
import apiService from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./AdminPage.css";

export default function AdminPage() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await apiService.getPendingAdminUsers();
    if (data?.success) {
      setPendingUsers(data.users || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  return (
    <main className="admin-page">
      <div className="admin-header glass-panel">
        <div className="admin-header-title">
          <ShieldAlert size={32} color="#3b82f6" />
          <div>
            <h1>Tableau de Bord Administrateur</h1>
            <p>Gestion des accréditations Onde Verte & Urgences</p>
          </div>
        </div>
        <div className="admin-stats">
          <div className="admin-stat-card">
            <Users size={20} />
            <span>{pendingUsers.length} en attente</span>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <h2>Demandes d'accréditation en attente</h2>
        
        {isLoading ? (
          <div className="admin-loading">
            <Loader size={32} className="spin" />
            <p>Chargement des demandes...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="admin-empty glass-panel">
            <CheckCircle size={48} color="#10b981" />
            <h3>Tout est à jour !</h3>
            <p>Aucune demande d'accréditation en attente de validation.</p>
          </div>
        ) : (
          <div className="admin-table-container glass-panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Contact</th>
                  <th>Rôle Demandé</th>
                  <th>Date de demande</th>
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
                      <span className={`admin-role-badge ${u.role}`}>
                        {u.role_label}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-btn-approve" onClick={() => handleApprove(u.id)}>
                          <CheckCircle size={18} /> Approuver
                        </button>
                        <button className="admin-btn-reject" onClick={() => handleReject(u.id)}>
                          <XCircle size={18} /> Rejeter
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
    </main>
  );
}
