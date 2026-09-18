// purchasing.js — Consolidación de pedidos pendientes en órdenes de
// compra por proveedor (FS / DIFRUMARKET)

const { listarPedidosPendientes, marcarComoComprados } = require("./orders");
const { loadCatalogo } = require("./catalog");

function buscarProducto(nombreProducto) {
  const catalogo = loadCatalogo();
  // Match simple por nombre exacto. Si el bot manda variaciones de texto,
  // conviene mejorar esto con un match difuso (ver nota al final del archivo).
  return catalogo.find(
    (p) => p.producto.toLowerCase() === nombreProducto.toLowerCase()
  );
}

/**
 * Toma todos los pedidos pendientes, suma las cantidades por producto,
 * y arma una orden de compra separada por proveedor (FS / DIFRUMARKET),
 * con el costo real (no el precio de venta al cliente).
 *
 * @returns {{ ordenesPorProveedor: Object, pedidosIncluidos: number[], totalGeneral: number }}
 */
function generarOrdenDeCompra() {
  const pendientes = listarPedidosPendientes();

  if (pendientes.length === 0) {
    return { ordenesPorProveedor: {}, pedidosIncluidos: [], totalGeneral: 0 };
  }

  // 1) Sumar cantidades por producto entre todos los pedidos pendientes
  const totalesPorProducto = {}; // { "Nuez Mariposa Extra Light": 25, ... }

  for (const pedido of pendientes) {
    for (const item of pedido.items) {
      const key = item.producto;
      totalesPorProducto[key] = (totalesPorProducto[key] || 0) + item.cantidad_kg;
    }
  }

  // 2) Agrupar por proveedor usando el catálogo, calculando costo real
  const ordenesPorProveedor = {}; // { FS: { items: [...], total: N }, DIFRUMARKET: {...} }

  for (const [producto, cantidadTotal] of Object.entries(totalesPorProducto)) {
    const infoProducto = buscarProducto(producto);

    if (!infoProducto) {
      console.warn(`⚠️  Producto no encontrado en catálogo: "${producto}" — revisar manualmente.`);
      continue;
    }

    const { proveedor, costo_kg, presentacion } = infoProducto;
    const subtotal = costo_kg * cantidadTotal;

    if (!ordenesPorProveedor[proveedor]) {
      ordenesPorProveedor[proveedor] = { items: [], total: 0 };
    }

    ordenesPorProveedor[proveedor].items.push({
      producto,
      presentacion,
      cantidad_kg: cantidadTotal,
      costo_kg,
      subtotal,
    });
    ordenesPorProveedor[proveedor].total += subtotal;
  }

  const totalGeneral = Object.values(ordenesPorProveedor).reduce(
    (acc, o) => acc + o.total,
    0
  );

  return {
    ordenesPorProveedor,
    pedidosIncluidos: pendientes.map((p) => p.id),
    totalGeneral,
  };
}

/**
 * Genera un texto legible de la orden de compra, listo para copiar y
 * mandarle al proveedor o guardar como registro.
 */
function formatearOrdenDeCompra({ ordenesPorProveedor, totalGeneral }) {
  const lineas = [];
  lineas.push("ORDEN DE COMPRA CONSOLIDADA");
  lineas.push(`Fecha: ${new Date().toLocaleDateString("es-AR")}`);
  lineas.push("");

  for (const [proveedor, orden] of Object.entries(ordenesPorProveedor)) {
    lineas.push(`--- ${proveedor} ---`);
    for (const item of orden.items) {
      lineas.push(
        `- ${item.producto} (${item.presentacion}): ${item.cantidad_kg}kg x $${item.costo_kg.toLocaleString("es-AR")} = $${item.subtotal.toLocaleString("es-AR")}`
      );
    }
    lineas.push(`Subtotal ${proveedor}: $${orden.total.toLocaleString("es-AR")}`);
    lineas.push("");
  }

  lineas.push(`TOTAL GENERAL A COMPRAR: $${totalGeneral.toLocaleString("es-AR")}`);
  return lineas.join("\n");
}

module.exports = {
  generarOrdenDeCompra,
  formatearOrdenDeCompra,
  marcarPedidosComoComprados: marcarComoComprados,
};

// -----------------------------------------------------------------------
// NOTA: el match de producto es por nombre exacto contra catalogo.json.
// Si en el futuro el bot arma pedidos con nombres levemente distintos
// (ej. "nuez mariposa" en vez de "Nuez Mariposa Extra Light"), conviene
// agregar una librería de fuzzy matching (ej. "fuse.js") para evitar que
// productos queden sin clasificar por diferencias de tipeo/mayúsculas.
// -----------------------------------------------------------------------
