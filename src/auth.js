// auth.js — Login simple para el panel (pensado para dos usuarios: vos y
// tu socio). Las claves se guardan hasheadas (nunca en texto plano) en
// src/data/usuarios.json, usando el módulo "crypto" que ya trae Node —
// no hace falta instalar nada nuevo.
//
// Las sesiones viven en memoria: si el servidor se reinicia (por ejemplo
// al redesplegar un cambio), todos quedan desconectados y hay que volver
// a entrar con usuario y clave. No es un problema para dos personas.

const fs = require("fs");
const path = require("path");
const { dataPath } = require("./data-dir");
const crypto = require("crypto");

const USUARIOS_FILE = dataPath("usuarios.json");
const SESSION_COOKIE = "sesion";
const SESSION_DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

const sesiones = new Map(); // token -> { usuario, expira }

// --- Usuarios y claves ---

function loadUsuarios() {
  if (!fs.existsSync(USUARIOS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USUARIOS_FILE, "utf-8"));
}

function saveUsuarios(usuarios) {
  fs.writeFileSync(USUARIOS_FILE, JSON.stringify(usuarios, null, 2), "utf-8");
}

function hashClave(claveEnTexto) {
  const sal = crypto.randomBytes(16).toString("hex");
  const derivada = crypto.scryptSync(claveEnTexto, sal, 64).toString("hex");
  return `${sal}:${derivada}`;
}

function claveCoincide(claveEnTexto, hashGuardado) {
  const [sal, derivadaGuardada] = hashGuardado.split(":");
  const derivada = crypto.scryptSync(claveEnTexto, sal, 64);
  const guardada = Buffer.from(derivadaGuardada, "hex");
  if (guardada.length !== derivada.length) return false;
  return crypto.timingSafeEqual(guardada, derivada); // evita timing attacks
}

/** Crea un usuario nuevo o pisa la clave si ya existe (lo usa setup-usuarios.js). */
function crearUsuario(usuario, claveEnTexto) {
  const usuarios = loadUsuarios().filter((u) => u.usuario !== usuario);
  usuarios.push({ usuario, hash: hashClave(claveEnTexto) });
  saveUsuarios(usuarios);
}

function verificarCredenciales(usuario, claveEnTexto) {
  const encontrado = loadUsuarios().find((u) => u.usuario === usuario);
  if (!encontrado) return false;
  return claveCoincide(claveEnTexto, encontrado.hash);
}

function hayUsuariosConfigurados() {
  return loadUsuarios().length > 0;
}

// --- Sesiones ---

function crearSesion(usuario) {
  const token = crypto.randomBytes(32).toString("hex");
  sesiones.set(token, { usuario, expira: Date.now() + SESSION_DURACION_MS });
  return token;
}

function usuarioDeSesion(token) {
  const sesion = sesiones.get(token);
  if (!sesion) return null;
  if (Date.now() > sesion.expira) {
    sesiones.delete(token);
    return null;
  }
  return sesion.usuario;
}

function cerrarSesion(token) {
  sesiones.delete(token);
}

// --- Freno a fuerza bruta en el login (por IP) ---

const intentosLogin = new Map(); // ip -> { cuenta, expira }
const MAX_INTENTOS = 6;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

function intentoPermitido(ip) {
  const entry = intentosLogin.get(ip);
  if (!entry) return true;
  if (Date.now() > entry.expira) {
    intentosLogin.delete(ip);
    return true;
  }
  return entry.cuenta < MAX_INTENTOS;
}

function registrarIntentoFallido(ip) {
  const entry = intentosLogin.get(ip) || { cuenta: 0, expira: Date.now() + VENTANA_MS };
  entry.cuenta += 1;
  intentosLogin.set(ip, entry);
}

function limpiarIntentos(ip) {
  intentosLogin.delete(ip);
}

// --- Cookies (manual, sin dependencias externas) ---

function parsearCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const idx = c.indexOf("=");
      return [c.slice(0, idx).trim(), decodeURIComponent(c.slice(idx + 1).trim())];
    })
  );
}

function setCookieSesion(res, token) {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_DURACION_MS / 1000)}; SameSite=Lax${seguro}`
  );
}

function limpiarCookieSesion(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

// --- Middleware ---

// Lo único que se puede pedir sin estar logueado: el webhook de WhatsApp
// (lo llama Meta, no tiene sesión) y lo mínimo para mostrar el login.
const RUTAS_PUBLICAS = new Set([
  "/webhook",
  "/login.html",
  "/api/login",
  "/logo.png",
  "/manifest.webmanifest",
  "/sw.js",
]);

function requiereSesion(req, res, next) {
  if (RUTAS_PUBLICAS.has(req.path)) return next();

  const cookies = parsearCookies(req);
  const token = cookies[SESSION_COOKIE];
  const usuario = token ? usuarioDeSesion(token) : null;

  if (!usuario) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "No autenticado" });
    }
    return res.redirect("/login.html");
  }

  req.usuarioActual = usuario;
  next();
}

module.exports = {
  crearUsuario,
  verificarCredenciales,
  hayUsuariosConfigurados,
  crearSesion,
  usuarioDeSesion,
  cerrarSesion,
  intentoPermitido,
  registrarIntentoFallido,
  limpiarIntentos,
  parsearCookies,
  setCookieSesion,
  limpiarCookieSesion,
  requiereSesion,
  SESSION_COOKIE,
};
