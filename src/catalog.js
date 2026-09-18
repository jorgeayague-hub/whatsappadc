// catalog.js — Fuente única de verdad del catálogo de productos.
//
// Tanto el bot de WhatsApp (ai.js) como el dashboard de gestión leen y
// escriben acá. Cualquier cambio hecho desde el panel se refleja al
// instante en el próximo mensaje que responda el bot, sin redeploy.

const fs = require("fs");
const path = require("path");
const { dataPath } = require("./data-dir");

const CATALOGO_FILE = dataPath("catalogo.json");

// El catálogo con los 91 productos viaja versionado en el repo, en
// src/data/catalogo.json — eso es lo que se sube a GitHub y se despliega
// con el código. Pero si DATA_DIR apunta a un volumen persistente (en
// producción), ese volumen arranca vacío la primera vez. Si el archivo
// todavía no existe en destino, lo copiamos desde el que viene con el
// código, una sola vez — las ediciones posteriores del panel quedan en
// el volumen y sobreviven a futuros redeploys sin pisarse.
const CATALOGO_SEMILLA = path.join(__dirname, "data", "catalogo.json");
if (!fs.existsSync(CATALOGO_FILE) && fs.existsSync(CATALOGO_SEMILLA)) {
  fs.copyFileSync(CATALOGO_SEMILLA, CATALOGO_FILE);
}

function loadCatalogo() {
  if (!fs.existsSync(CATALOGO_FILE)) return [];
  return JSON.parse(fs.readFileSync(CATALOGO_FILE, "utf-8"));
}

function saveCatalogo(catalogo) {
  fs.writeFileSync(CATALOGO_FILE, JSON.stringify(catalogo, null, 2), "utf-8");
}

function calcularPrecioVenta(costo_kg, margen) {
  return Math.round((costo_kg * (1 + margen)) / 10) * 10; // redondeo a decena
}

/** Agrega un producto nuevo al catálogo. */
function agregarProducto({ categoria, producto, proveedor, presentacion, costo_kg, margen = 0.3 }) {
  const catalogo = loadCatalogo();

  if (catalogo.some((p) => p.producto.toLowerCase() === producto.toLowerCase())) {
    throw new Error(`Ya existe un producto llamado "${producto}"`);
  }

  const nuevo = {
    categoria,
    producto,
    proveedor,
    presentacion,
    costo_kg,
    margen,
    precio_venta_kg: calcularPrecioVenta(costo_kg, margen),
  };

  catalogo.push(nuevo);
  saveCatalogo(catalogo);
  return nuevo;
}

/** Edita un producto existente (por nombre exacto). Cualquier campo es opcional. */
function actualizarProducto(nombreProducto, cambios) {
  const catalogo = loadCatalogo();
  const idx = catalogo.findIndex(
    (p) => p.producto.toLowerCase() === nombreProducto.toLowerCase()
  );

  if (idx === -1) throw new Error(`Producto no encontrado: "${nombreProducto}"`);

  const actualizado = { ...catalogo[idx], ...cambios };
  actualizado.precio_venta_kg = calcularPrecioVenta(actualizado.costo_kg, actualizado.margen);

  catalogo[idx] = actualizado;
  saveCatalogo(catalogo);
  return actualizado;
}

/** Elimina un producto del catálogo (por nombre exacto). */
function eliminarProducto(nombreProducto) {
  const catalogo = loadCatalogo();
  const nuevo = catalogo.filter(
    (p) => p.producto.toLowerCase() !== nombreProducto.toLowerCase()
  );

  if (nuevo.length === catalogo.length) {
    throw new Error(`Producto no encontrado: "${nombreProducto}"`);
  }

  saveCatalogo(nuevo);
  return true;
}

module.exports = {
  loadCatalogo,
  saveCatalogo,
  agregarProducto,
  actualizarProducto,
  eliminarProducto,
  calcularPrecioVenta,
};
