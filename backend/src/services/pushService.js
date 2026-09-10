import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin attendu pour le fichier de service account Firebase
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, "../../firebase-service-account.json");

let isFirebaseInitialized = false;
let firebaseAdmin = null;

/**
 * Initialise Firebase Admin SDK.
 * Si le fichier `firebase-service-account.json` n'est pas présent,
 * le service passe en mode "Mock" (Simulation) pour ne pas bloquer l'application.
 */
export function initPushService() {
  try {
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
      firebaseAdmin = require("firebase-admin");
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      console.log("[Push Service] 🟢 Firebase Admin SDK initialisé avec succès.");
    } else {
      console.warn(
        `[Push Service] ⚠️ Fichier service account introuvable à ${SERVICE_ACCOUNT_PATH}.`
      );
      console.warn("[Push Service] ⚠️ Passage en mode SIMULATION (Mock). Les notifications Push ne seront pas réellement envoyées.");
    }
  } catch (error) {
    console.error("[Push Service] ❌ Erreur lors de l'initialisation de Firebase Admin:", error.message);
    console.warn("[Push Service] ⚠️ Passage en mode SIMULATION (Mock).");
  }
}

/**
 * Envoie une notification Push ciblée (Multicast) à une liste de tokens FCM.
 * 
 * @param {string[]} tokens - Tableau des tokens FCM destinataires
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps du texte
 * @param {Object} data - Données supplémentaires invisibles (payload)
 */
export async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    return { success: false, message: "Aucun token fourni" };
  }

  // Filtrer les tokens vides ou nuls
  const validTokens = tokens.filter(t => t && t.trim().length > 0);
  
  if (validTokens.length === 0) {
    return { success: false, message: "Aucun token valide fourni" };
  }

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      click_action: "FLUTTER_NOTIFICATION_CLICK", // Indispensable pour Flutter
    },
    tokens: validTokens,
    android: {
      priority: "high",
      notification: {
        channelId: "cityflow_high_priority",
        sound: "default",
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true,
        }
      }
    }
  };

  // MODE MOCK : On simule l'envoi
  if (!isFirebaseInitialized) {
    console.log(`[Push Service (MOCK)] 📲 Envoi simulé à ${validTokens.length} appareil(s):`);
    console.log(`  - Titre : ${title}`);
    console.log(`  - Body  : ${body}`);
    return { success: true, mocked: true, count: validTokens.length };
  }

  // MODE RÉEL : On envoie via Firebase
  try {
    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    
    console.log(`[Push Service] ✅ Multicast terminé : ${response.successCount} succès, ${response.failureCount} échecs.`);
    
    // Gérer les tokens invalides (désinstallations d'app, etc.)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: validTokens[idx],
            error: resp.error.code,
          });
        }
      });
      console.warn("[Push Service] ⚠️ Tokens en échec :", failedTokens);
      // NOTE: Dans une app de prod, on supprimerait ces tokens de la BDD ici.
    }

    return { 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    };

  } catch (error) {
    console.error("[Push Service] ❌ Erreur critique lors de l'envoi push:", error);
    return { success: false, error: error.message };
  }
}
