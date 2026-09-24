// orders.js — Registro de pedidos de clientes (orden interna)
//
// MVP: guarda los pedidos en un archivo JSON local. Cuando el volumen
// crezca, reemplazar por una base de datos real (SQLite/Postgres) sin
// cambiar la interfaz de estas funciones.

const fs = require("fs");
const path = require("path");
const { dataPath } = require("./data-dir");

const ORDERS_FILE = dataPath("pedidos.json");

function loadOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

/**
 * Registra un nuevo pedido de cliente.
 * @param {Object} order
 * @param {string} order.cliente - número de WhatsApp o nombre del cliente
 * @param {Array<{producto: string, cantidad_kg: number}>} order.items
 */
function registrarPedido({ cliente, items }) {
  const orders = loadOrders();
  const nuevoId = orders.reduce((max, o) => Math.max(max, o.id), 0) + 1;

  const nuevoPedido = {
    id: nuevoId,
    numero: `#${String(nuevoId).padStart(4, "0")}`,
    cliente,
    items,
    fecha: new Date().toISOString(),
    estado: "pendiente_de_compra", // pendiente_de_compra -> comprado -> preparado -> entregado
  };

  orders.push(nuevoPedido);
  saveOrders(orders);
  return nuevoPedido;
}

/**
 * Devuelve todos los pedidos que todavía no fueron pasados a compra.
 */
function listarPedidosPendientes() {
  return loadOrders().filter((o) => o.estado === "pendiente_de_compra");
}

/**
 * Devuelve todos los pedidos, sin importar el estado (para el dashboard).
 */
function listarTodosLosPedidos() {
  return loadOrders().sort((a, b) => b.id - a.id); // más recientes primero
}

/**
 * Cambia el estado de un pedido puntual.
 * Estados válidos: pendiente_de_compra -> comprado -> preparado -> entregado
 */
function actualizarEstadoPedido(id, nuevoEstado) {
  const ESTADOS_VALIDOS = ["pendiente_de_compra", "comprado", "preparado", "entregado"];
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: "${nuevoEstado}"`);
  }

  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error(`Pedido no encontrado: ${id}`);

  orders[idx].estado = nuevoEstado;
  saveOrders(orders);
  return orders[idx];
}

/**
 * Marca un grupo de pedidos como "ya comprados" (después de generar la
 * orden de compra a los proveedores).
 */
function marcarComoComprados(ids) {
  const orders = loadOrders();
  const actualizados = orders.map((o) =>
    ids.includes(o.id) ? { ...o, estado: "comprado" } : o
  );
  saveOrders(actualizados);
}

module.exports = {
  registrarPedido,
  listarPedidosPendientes,
  listarTodosLosPedidos,
  actualizarEstadoPedido,
  marcarComoComprados,
};
