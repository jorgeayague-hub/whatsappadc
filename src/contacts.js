// contacts.js — Agenda de contactos (nombre, dirección, etc.) por número de WhatsApp.

const fs = require("fs");
const { dataPath } = require("./data-dir");

const CONTACTOS_FILE = dataPath("contactos.json");
const CAMPOS = ["nombre", "empresa", "direccion", "localidad", "email", "notas"];
const MAX_LARGO = 500;
const NUMERO_VALIDO = /^\d{8,15}$/;

function loadContactos() {
  if (!fs.existsSync(CONTACTOS_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONTACTOS_FILE, "utf-8"));
}

function saveContactos(contactos) {
  fs.writeFileSync(CONTACTOS_FILE, JSON.stringify(contactos, null, 2), "utf-8");
}

function listarContactos() {
  return Object.entries(loadContactos())
    .map(([numero, ficha]) => ({ numero, ...ficha }))
    .sort((a, b) => (a.nombre || a.numero).localeCompare(b.nombre || b.numero, "es"));
}

/** Crea o actualiza la ficha de un número. */
function guardarContacto(numero, datos = {}) {
  if (!NUMERO_VALIDO.test(numero)) {
    throw new Error("Número inválido: usá solo dígitos con código de país (ej. 5492604123456)");
  }

  const ficha = {};
  for (const campo of CAMPOS) {
    ficha[campo] = String(datos[campo] ?? "").trim().slice(0, MAX_LARGO);
  }
  if (!ficha.nombre) throw new Error("El contacto necesita un nombre");

  const contactos = loadContactos();
  contactos[numero] = ficha;
  saveContactos(contactos);
  return { numero, ...ficha };
}

function eliminarContacto(numero) {
  const contactos = loadContactos();
  if (!contactos[numero]) throw new Error(`No existe el contacto "${numero}"`);
  delete contactos[numero];
  saveContactos(contactos);
}

module.exports = { listarContactos, guardarContacto, eliminarContacto };
