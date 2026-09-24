// messages.js — Bandeja compartida de mensajes de WhatsApp.
// Todo mensaje entrante o saliente pasa por acá. Jorge y su socio
// contestan manualmente desde el panel; no hay IA respondiendo sola.

const fs = require("fs");
const path = require("path");
const { dataPath } = require("./data-dir");

const CHATS_FILE = dataPath("chats.json");

function loadChats() {
  if (!fs.existsSync(CHATS_FILE)) return [];
  return JSON.parse(fs.readFileSync(CHATS_FILE, "utf-8"));
}

function saveChats(chats) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2), "utf-8");
}

/** Devuelve todos los chats, más recientes primero. */
function listarChats() {
  return loadChats().sort(
    (a, b) => new Date(b.ultimaActualizacion) - new Date(a.ultimaActualizacion)
  );
}

function obtenerChat(cliente) {
  return loadChats().find((c) => c.cliente === cliente) || null;
}

/**
 * Registra un mensaje ENTRANTE de un cliente (llega por el webhook de WhatsApp).
 * Crea el chat si es la primera vez que escribe.
 */
function registrarMensajeEntrante(cliente, texto, nombreContacto) {
  const chats = loadChats();
  let chat = chats.find((c) => c.cliente === cliente);

  if (!chat) {
    chat = {
      cliente,
      nombreContacto: nombreContacto || cliente,
      mensajes: [],
      noLeido: true,
      creado: new Date().toISOString(),
      ultimaActualizacion: new Date().toISOString(),
    };
    chats.push(chat);
  }

  chat.mensajes.push({
    direccion: "entrante",
    texto,
    fecha: new Date().toISOString(),
  });
  chat.noLeido = true;
  chat.ultimaActualizacion = new Date().toISOString();

  saveChats(chats);
  return chat;
}

/**
 * Registra un mensaje SALIENTE escrito por un admin (Jorge o su socio)
 * desde el panel, y lo manda por WhatsApp.
 */
function registrarMensajeSaliente(cliente, texto, autor) {
  const chats = loadChats();
  let chat = chats.find((c) => c.cliente === cliente);

  if (!chat) {
    chat = {
      cliente,
      nombreContacto: cliente,
      mensajes: [],
      noLeido: false,
      creado: new Date().toISOString(),
      ultimaActualizacion: new Date().toISOString(),
    };
    chats.push(chat);
  }

  chat.mensajes.push({
    direccion: "saliente",
    texto,
    autor: autor || "Desconocido",
    fecha: new Date().toISOString(),
  });
  chat.noLeido = false;
  chat.ultimaActualizacion = new Date().toISOString();

  saveChats(chats);
  return chat;
}

/** Marca un chat como leído (alguien lo abrió en el panel). */
function marcarLeido(cliente) {
  const chats = loadChats();
  const chat = chats.find((c) => c.cliente === cliente);
  if (!chat) throw new Error(`No existe conversación con "${cliente}"`);
  chat.noLeido = false;
  saveChats(chats);
  return chat;
}

/** Cuántos chats tienen mensajes sin leer (para el badge y las notificaciones push). */
function contarNoLeidos() {
  return loadChats().filter((c) => c.noLeido).length;
}

module.exports = {
  listarChats,
  obtenerChat,
  registrarMensajeEntrante,
  registrarMensajeSaliente,
  marcarLeido,
  contarNoLeidos,
};
