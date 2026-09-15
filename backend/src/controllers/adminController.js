import { db } from "../services/database.js";

// GET /api/admin/users/pending
export const getPendingUsers = async (req, res) => {
  try {
    const users = await db.all("SELECT id, name, username, email, phone, role, role_label, account_status, created_at FROM users WHERE account_status = 'pending' ORDER BY created_at DESC");
    res.json({ success: true, users });
  } catch (err) {
    console.error("Error fetching pending users:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// POST /api/admin/users/:id/approve
export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("UPDATE users SET account_status = 'approved' WHERE id = ?", [id]);
    res.json({ success: true, message: "Utilisateur approuvé avec succès" });
  } catch (err) {
    console.error("Error approving user:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// POST /api/admin/users/:id/reject
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    // On pourrait aussi supprimer l'utilisateur, mais changer le statut en 'rejected' est plus tracable
    await db.run("UPDATE users SET account_status = 'rejected' WHERE id = ?", [id]);
    res.json({ success: true, message: "Utilisateur rejeté avec succès" });
  } catch (err) {
    console.error("Error rejecting user:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
