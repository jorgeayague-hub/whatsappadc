// test-purchasing.js — Prueba manual del flujo de pedidos + compra
// consolidada, con datos de ejemplo (sin necesitar WhatsApp conectado).
//
// Correr con: node src/test-purchasing.js

const { registrarPedido } = require("./orders");
const { generarOrdenDeCompra, formatearOrdenDeCompra } = require("./purchasing");

// Simulamos 2 pedidos de clientes distintos
registrarPedido({
  cliente: "5492944000001 (Kiosco Don José - Bariloche)",
  items: [
    { producto: "Nuez Mariposa Extra Light", cantidad_kg: 10 },
    { producto: "Almendra Guara - Grande", cantidad_kg: 10 },
  ],
});

registrarPedido({
  cliente: "5492944000002 (Dietética Sol - San Martín de los Andes)",
  items: [
    { producto: "Nuez Mariposa Extra Light", cantidad_kg: 15 },
    { producto: "Maní tostado salado S1", cantidad_kg: 20 },
  ],
});

// Generamos la orden de compra consolidada
const orden = generarOrdenDeCompra();
console.log(formatearOrdenDeCompra(orden));
console.log("\nPedidos incluidos:", orden.pedidosIncluidos);
