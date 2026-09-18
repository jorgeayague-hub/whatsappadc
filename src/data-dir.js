// data-dir.js — Dónde se guardan los archivos de datos (catálogo, chats,
// pedidos, usuarios, suscripciones push).
//
// Por default usa src/data/ (para desarrollo local). En producción, si se
// define la variable de entorno DATA_DIR, se usa esa carpeta en su lugar —
// pensado para apuntar ahí un volumen/disco persistente del hosting
// (Railway, Render), sin que dependa de adivinar en qué ruta interna del
// contenedor termina quedando el proyecto.
//
// Ejemplo en Railway: creás un volumen con Mount Path "/data" y agregás
// la variable DATA_DIR=/data — el proyecto automáticamente empieza a leer
// y escribir ahí, sin tocar nada más del código.

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : path.join(__dirname, "data");

// Si estamos usando la carpeta local de desarrollo, ya existe (tiene el
// catálogo versionado en git). Si es una carpeta nueva (ej. un volumen
// recién montado, vacío), la creamos para que los módulos no fallen al
// intentar escribir ahí por primera vez.
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function dataPath(nombreArchivo) {
  return path.join(DATA_DIR, nombreArchivo);
}

module.exports = { dataPath, DATA_DIR };
