import nodemailer from "nodemailer";

/**
 * Service d'expédition multi-canal pour CityFlow (E-mail réel, WhatsApp & SMS)
 */

// --------------------------------------------------------------------------
// 1. EXPÉDITION D'E-MAILS RÉELS (SMTP / GMAIL / BREVO / ETHEREAL)
// --------------------------------------------------------------------------
let mailTransporter = null;

async function getMailTransporter() {
  if (mailTransporter) return mailTransporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    // Transporteur SMTP de production personnalisé (Gmail, Brevo, Outlook, etc.)
    mailTransporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: { user, pass },
    });
    console.log(`📧 [NotificationService] Connecteur SMTP configuré pour ${user} (${host})`);
  } else {
    // Si aucun SMTP n'est configuré dans .env, créer un compte de test réel Ethereal
    try {
      const testAccount = await nodemailer.createTestAccount();
      mailTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`📧 [NotificationService] Compte de test Ethereal généré (${testAccount.user})`);
    } catch (err) {
      console.warn("⚠️ [NotificationService] Impossible de créer le transporteur Ethereal :", err.message);
    }
  }

  return mailTransporter;
}

export async function sendRealEmail({ to, name, code }) {
  try {
    const transporter = await getMailTransporter();
    if (!transporter) {
      return { success: false, error: "Aucun serveur SMTP disponible" };
    }

    const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "securite@cityflow.cm";
    const appName = "CityFlow Cameroun";

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #064e3b 0%, #087f5b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CityFlow</h1>
          <p style="margin: 0; font-size: 13px; color: #d1fae5; font-weight: 500;">Plateforme Intelligente de Gestion du Trafic Urbain</p>
        </div>
        
        <div style="padding: 32px 24px; color: #1e293b;">
          <p style="font-size: 15px; margin: 0 0 16px;">Bonjour <strong>${name || "Utilisateur"}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 24px;">
            Vous avez demandé un code de sécurité pour vous connecter ou créer votre compte sur l'application <strong>CityFlow</strong>.
          </p>
          
          <div style="background: #f0fdf4; border: 2px dashed #087f5b; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <span style="display: block; font-size: 12px; font-weight: 700; color: #065f46; letter-spacing: 1px; margin-bottom: 6px;">VOTRE CODE DE SÉCURITÉ (VALABLE 5 MINUTES)</span>
            <span style="display: inline-block; font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #087f5b; font-family: monospace;">${code}</span>
          </div>
          
          <p style="font-size: 12.5px; color: #64748b; line-height: 1.4; margin: 0 0 16px;">
            🔒 <strong>Mesure de sécurité :</strong> Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail. Ne transmettez jamais ce code à un tiers.
          </p>
        </div>
        
        <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
          © 2026 CityFlow Inc. • Yaoundé & Douala, Cameroun.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${appName}" <${senderEmail}>`,
      to,
      subject: `[${code}] Votre code de sécurité CityFlow`,
      text: `Bonjour ${name || "Utilisateur"}, votre code de vérification CityFlow est : ${code}. Valable 5 minutes.`,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [Email Réel - Aperçu en ligne] : ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (error) {
    console.error("❌ [NotificationService] Erreur lors de l'envoi de l'e-mail :", error.message);
    return { success: false, error: error.message };
  }
}

// --------------------------------------------------------------------------
// 2. EXPÉDITION DE MESSAGES WHATSAPP RÉELS (META CLOUD API / TWILIO)
// --------------------------------------------------------------------------
export async function sendRealWhatsApp({ toPhone, name, code }) {
  // Nettoyage du numéro de téléphone (doit inclure l'indicatif pays, ex: +237)
  const cleanPhone = toPhone.replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("237") ? cleanPhone : `237${cleanPhone}`;
  const messageText = `🚦 [CityFlow Sécurité] Bonjour ${name || ""}, votre code d'authentification CityFlow est : ${code}. Il expire dans 5 minutes.`;

  // Lien direct WhatsApp Web / API (permet de déclencher un message en 1 clic)
  const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;

  // Si des clés Twilio sont présentes dans .env
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WA_NUMBER) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      
      const body = new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WA_NUMBER}`,
        To: `whatsapp:+${formattedPhone}`,
        Body: messageText,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await res.json();
      return { success: res.ok, sid: data.sid, directWhatsAppUrl };
    } catch (err) {
      console.warn("⚠️ [NotificationService] Erreur envoi WhatsApp Twilio :", err.message);
    }
  }

  // Si des clés Meta WhatsApp Cloud API sont présentes
  if (process.env.META_WA_PHONE_NUMBER_ID && process.env.META_WA_ACCESS_TOKEN) {
    try {
      const url = `https://graph.facebook.com/v19.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.META_WA_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: messageText },
        }),
      });

      const data = await res.json();
      return { success: res.ok, metaId: data.messages?.[0]?.id, directWhatsAppUrl };
    } catch (err) {
      console.warn("⚠️ [NotificationService] Erreur Meta WhatsApp :", err.message);
    }
  }

  return {
    success: true,
    directWhatsAppUrl,
    simulated: true,
  };
}

// --------------------------------------------------------------------------
// 3. EXPÉDITION DE SMS RÉELS (TWILIO / ORANGE DEVELOPER CAMEROUN)
// --------------------------------------------------------------------------
export async function sendRealSms({ toPhone, name, code }) {
  const cleanPhone = toPhone.replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("237") ? `+${cleanPhone}` : `+237${cleanPhone}`;
  const messageText = `CityFlow : Votre code de connexion est ${code}. Valide 5 minutes.`;

  // Twilio SMS
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

      const body = new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER,
        To: formattedPhone,
        Body: messageText,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await res.json();
      return { success: res.ok, sid: data.sid };
    } catch (err) {
      console.warn("⚠️ [NotificationService] Erreur envoi SMS Twilio :", err.message);
    }
  }

  return {
    success: true,
    simulated: true,
  };
}
