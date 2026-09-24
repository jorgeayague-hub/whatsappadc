require("dotenv").config();

// server.js — Sistema de atención de WhatsApp para Aires de Cuyo
// Bandeja compartida: Jorge y su socio ven y responden los mensajes ellos
// mismos desde el panel. Sin IA respondiendo sola (por ahora).

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { sendWhatsAppMessage } = require("./whatsapp");
const { registrarPedido, listarTodosLosPedidos, actualizarEstadoPedido } = require("./orders");
const { generarOrdenDeCompra, formatearOrdenDeCompra } = require("./purchasing");
const { loadCatalogo, agregarProducto, actualizarProducto, eliminarProducto } = require("./catalog");
const {
  listarChats,
  obtenerChat,
  registrarMensajeEntrante,
  registrarMensajeSaliente,
  marcarLeido,
  contarNoLeidos,
} = require("./messages");
const { marcarEscribiendo, listarEscribiendo } = require("./presence");
const { configurarVapid, agregarSuscripcion, quitarSuscripcion, notificarTodos } = require("./push");
const auth = require("./auth");

const app = express();
app.set("trust proxy", true); // Railway/Render quedan atrás de un proxy — hace falta para IP real y cookies "Secure"
app.use(bodyParser.json());
app.use(auth.requiereSesion); // deja pasar login/webhook, exige sesión para todo lo demás
app.use(express.static(path.join(__dirname, "..", "public"))); // panel + logo + service worker

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const pushHabilitado = configurarVapid();

/**
 * 1) Verificación del webhook (Meta la llama una sola vez al configurar).
 */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * 2) Recepción de mensajes entrantes de WhatsApp.
 * Ya no hay IA acá: el mensaje se guarda en la bandeja compartida y se
 * avisa por push a Jorge y su socio. Contestan ellos desde el panel.
 */
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // responder rápido a Meta para que no reintente

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const contacto = change?.value?.contacts?.[0];

    if (!message || message.type !== "text") {
      return; // Ignoramos audios/imágenes en este MVP.
    }

    const from = message.from;
    const text = message.text.body;
    const nombreContacto = contacto?.profile?.name;

    console.log(`Mensaje de ${from} (${nombreContacto || "sin nombre"}): ${text}`);

    registrarMensajeEntrante(from, text, nombreContacto);

    if (pushHabilitado) {
      await notificarTodos({
        titulo: `${nombreContacto || from} te escribió`,
        cuerpo: text,
        url: `/dashboard.html?chat=${encodeURIComponent(from)}`,
      });
    }
  } catch (err) {
    console.error("Error procesando mensaje entrante:", err);
  }
});

// =========================================================================
// API DEL PANEL DE GESTIÓN
// Protegida por sesión (ver auth.js) — todo acá abajo requiere haber
// entrado antes por /login.html.
// =========================================================================

app.get("/", (req, res) => res.redirect("/dashboard.html"));

// --- Autenticación ---

app.post("/api/login", (req, res) => {
  const ip = req.ip;

  if (!auth.intentoPermitido(ip)) {
    return res.status(429).json({ error: "Demasiados intentos. Probá de nuevo en unos minutos." });
  }

  if (!auth.hayUsuariosConfigurados()) {
    return res.status(400).json({
      error: 'Todavía no se creó ningún usuario. Correr "node src/setup-usuarios.js" en el servidor.',
    });
  }

  const { usuario, clave } = req.body;

  if (!usuario || !clave || !auth.verificarCredenciales(usuario, clave)) {
    auth.registrarIntentoFallido(ip);
    return res.status(401).json({ error: "Usuario o clave incorrectos." });
  }

  auth.limpiarIntentos(ip);
  const token = auth.crearSesion(usuario);
  auth.setCookieSesion(res, token);
  res.json({ ok: true, usuario });
});

app.post("/api/logout", (req, res) => {
  const cookies = auth.parsearCookies(req);
  const token = cookies[auth.SESSION_COOKIE];
  if (token) auth.cerrarSesion(token);
  auth.limpiarCookieSesion(res);
  res.json({ ok: true });
});

app.get("/api/whoami", (req, res) => {
  res.json({ usuario: req.usuarioActual });
});

// --- Bandeja de mensajes ---

app.get("/api/chats", (req, res) => {
  res.json(listarChats());
});

app.get("/api/chats/:cliente", (req, res) => {
  const chat = obtenerChat(req.params.cliente);
  if (!chat) return res.status(404).json({ error: "No existe esa conversación" });
  res.json(chat);
});

app.post("/api/chats/:cliente/responder", async (req, res) => {
  try {
    const cliente = req.params.cliente;
    const { texto } = req.body;

    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }

    if (!/^\d{8,15}$/.test(cliente)) {
      return res.status(400).json({ error: "Número inválido: usá solo dígitos con código de país (ej. 5492604123456)" });
    }

    await sendWhatsAppMessage(cliente, texto);
    const chat = registrarMensajeSaliente(cliente, texto, req.usuarioActual);
    res.json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/chats/:cliente/leido", (req, res) => {
  try {
    const chat = marcarLeido(req.params.cliente);
    res.json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/no-leidos", (req, res) => {
  res.json({ cantidad: contarNoLeidos() });
});

// --- Presencia en vivo ("Fulano está escribiendo acá") ---

app.post("/api/chats/:cliente/escribiendo", (req, res) => {
  marcarEscribiendo(req.params.cliente, req.usuarioActual);
  res.json({ ok: true });
});

app.get("/api/escribiendo", (req, res) => {
  res.json(listarEscribiendo());
});

// --- Suscripción a notificaciones push ---

app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

app.post("/api/push/suscribirse", (req, res) => {
  const { subscription } = req.body;
  agregarSuscripcion(subscription, req.usuarioActual);
  res.json({ ok: true });
});

app.post("/api/push/desuscribirse", (req, res) => {
  const { endpoint } = req.body;
  quitarSuscripcion(endpoint);
  res.json({ ok: true });
});

// --- Pedidos ---

app.get("/api/pedidos", (req, res) => {
  res.json(listarTodosLosPedidos());
});

app.post("/api/pedidos", (req, res) => {
  try {
    const { cliente, items } = req.body;
    const pedido = registrarPedido({ cliente, items });
    res.status(201).json(pedido);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/pedidos/:id/estado", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { estado } = req.body;
    const actualizado = actualizarEstadoPedido(id, estado);
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Orden de compra consolidada ---

app.get("/api/orden-de-compra", (req, res) => {
  const orden = generarOrdenDeCompra();
  res.json(orden);
});

app.get("/admin/orden-de-compra", (req, res) => {
  const orden = generarOrdenDeCompra();
  res.type("text/plain").send(formatearOrdenDeCompra(orden));
});

// --- Catálogo ---

app.get("/api/catalogo", (req, res) => {
  res.json(loadCatalogo());
});

app.post("/api/catalogo", (req, res) => {
  try {
    const nuevo = agregarProducto(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/catalogo/:producto", (req, res) => {
  try {
    const actualizado = actualizarProducto(req.params.producto, req.body);
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/catalogo/:producto", (req, res) => {
  try {
    eliminarProducto(req.params.producto);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
