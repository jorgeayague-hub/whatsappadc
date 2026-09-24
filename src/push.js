// push.js — Notificaciones push al celular (Web Push estándar).
// Requiere las claves VAPID en el .env (se generan una sola vez, ver README).
// Cada admin que instale la web como app y acepte notificaciones queda
// suscripto acá; cuando llega un mensaje nuevo de un cliente, les avisamos
// a todos los suscriptos.

const fs = require("fs");
const path = require("path");
const { dataPath } = require("./data-dir");
const webpush = require("web-push");

const SUBS_FILE = dataPath("push-subscriptions.json");

function configurarVapid() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("⚠️  Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en .env — las notificaciones push no van a funcionar todavía.");
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${VAPID_CONTACT_EMAIL || "admin@airesdecuyo.com"}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  return true;
}

function loadSubs() {
  if (!fs.existsSync(SUBS_FILE)) return [];
  return JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
}

function saveSubs(subs) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), "utf-8");
}

/** Guarda la suscripción push de un admin (se llama desde el navegador al aceptar notificaciones). */
function agregarSuscripcion(subscription, autor) {
  if (!subscription || typeof subscription.endpoint !== "string") return;
  const subs = loadSubs();
  // Evitar duplicados si ya se había suscripto antes desde el mismo dispositivo
  const yaExiste = subs.some((s) => s.subscription.endpoint === subscription.endpoint);
  if (!yaExiste) {
    subs.push({ subscription, autor: autor || "Desconocido", fecha: new Date().toISOString() });
    saveSubs(subs);
  }
}

function quitarSuscripcion(endpoint) {
  const subs = loadSubs().filter((s) => s.subscription.endpoint !== endpoint);
  saveSubs(subs);
}

/** Manda una notificación a todos los admins suscriptos. */
async function notificarTodos({ titulo, cuerpo, url }) {
  const subs = loadSubs();
  const payload = JSON.stringify({ titulo, cuerpo, url: url || "/dashboard.html" });

  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Suscripción vencida o inválida (el celular la dio de baja) — la limpiamos.
        quitarSuscripcion(s.subscription.endpoint);
      } else {
        console.error("Error enviando push:", err.message);
      }
    }
  }
}

module.exports = { configurarVapid, agregarSuscripcion, quitarSuscripcion, notificarTodos };
