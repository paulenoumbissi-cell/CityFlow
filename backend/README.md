# CityFlow Backend API 🚦

Serveur API REST centralisé pour la plateforme intelligente de régulation du trafic urbain **CityFlow** (Yaoundé & Douala).

---

## 🛠️ Stack Technique
- **Runtime :** Node.js (v18+)
- **Framework :** Express.js
- **Architecture :** MVC Modulaire (Routes, Contrôleurs, Données unifiées)
- **Sécurité & Accès :** CORS activé pour autoriser le Web (Vite) et le Mobile (Flutter)

---

## 🚀 Installation & Démarrage

```bash
# Se placer dans le dossier backend
cd backend

# Installer les dépendances
npm install

# Démarrer le serveur (Port 3000 par défaut)
npm start

# Mode développement avec rechargement à chaud (Node 18+)
npm run dev
```

---

## 📡 Endpoints de l'API

### 1. Healthcheck
- `GET /api/health` : Vérifier l'état du serveur

### 2. Trafic & Prédictions
- `GET /api/traffic/nodes?city=Yaoundé` : Liste des carrefours/nœuds avec vitesse moyenne, retards et niveau de congestion (*fluid, moderate, heavy, jammed*).
- `GET /api/traffic/predictions?city=Yaoundé` : Prédictions d'évolution du trafic à +15m, +30m, +1h.

### 3. Calcul d'Itinéraires
- `POST /api/routes/calculate` : Calcul d'itinéraires comparatifs (*fastest, shortest, eco*) avec estimation des gains de temps et réduction de CO₂.
  ```json
  {
    "origin": "Carrefour Bastos",
    "destination": "Poste Centrale",
    "strategy": "fastest"
  }
  ```

### 4. Alertes & Incidents
- `GET /api/alerts?city=all` : Flux des incidents et alertes en direct (accidents, travaux, météo).
- `PATCH /api/alerts/:id/read` : Marquer une alerte comme lue.

### 5. Authentification
- `POST /api/auth/login` : Connexion utilisateur
- `POST /api/auth/register` : Inscription d'un nouvel utilisateur
