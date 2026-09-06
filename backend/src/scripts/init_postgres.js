import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/cityflow";
const schemaPath = path.resolve(__dirname, "../../data/schema_postgres.sql");

async function initPostgres() {
  console.log("==================================================");
  console.log("🐘 INITIALISATION DU SCHÉMA POSTGRESQL CITYFLOW");
  console.log("==================================================");
  console.log(`🔗 URL de connexion : ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log(`📄 Fichier SQL     : ${schemaPath}\n`);

  if (!fs.existsSync(schemaPath)) {
    console.error("❌ Fichier de schéma SQL introuvable :", schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");
  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log("1️⃣ Connexion au serveur PostgreSQL...");
    await client.connect();
    console.log("   ✅ Connecté avec succès !");

    console.log("2️⃣ Exécution du script de création des tables et des index...");
    await client.query(sql);
    console.log("   ✅ Tables, index et données par défaut créés avec succès !");

    console.log("3️⃣ Vérification des tables créées dans PostgreSQL :");
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("--------------------------------------------------");
    console.log("📋 TABLES ACTIVES DANS CITYFLOW (public) :");
    console.log("--------------------------------------------------");
    for (const row of res.rows) {
      const countRes = await client.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
      console.log(` • 📊 ${row.table_name.padEnd(22)} -> ${countRes.rows[0].count} ligne(s)`);
    }
    console.log("--------------------------------------------------");

    console.log("\n🎉 BASE DE DONNÉES POSTGRESQL OPÉRATIONNELLE À 100% !");
  } catch (err) {
    console.error("\n❌ ERREUR LORS DE L'INITIALISATION :");
    console.error(err.message);
    if (err.message.includes("password authentication failed")) {
      console.log("\n💡 CONSEIL : Vérifiez le mot de passe dans backend/.env (DATABASE_URL)");
    } else if (err.message.includes("database \"cityflow\" does not exist")) {
      console.log("\n💡 CONSEIL : Créez d'abord la base 'cityflow' dans pgAdmin (Clic droit sur Databases -> Create -> Database...)");
    }
  } finally {
    await client.end();
  }
}

initPostgres();
