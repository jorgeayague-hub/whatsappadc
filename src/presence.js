// presence.js — "Fulano está escribiendo acá" en tiempo real.
// Todo en memoria (no hace falta persistir esto en disco): cada admin
// avisa en qué chat está escribiendo, y se olvida sola a los pocos segundos
// si no manda más señales (por si cierra la pestaña sin avisar).

const escribiendo = new Map(); // cliente -> { autor, expira }

const VENTANA_MS = 8000; // si no llega otra señal en 8s, se asume que dejó de escribir

function marcarEscribiendo(cliente, autor) {
  escribiendo.set(cliente, { autor, expira: Date.now() + VENTANA_MS });
}

function quienEstaEscribiendo(cliente) {
  const entry = escribiendo.get(cliente);
  if (!entry) return null;
  if (Date.now() > entry.expira) {
    escribiendo.delete(cliente);
    return null;
  }
  return entry.autor;
}

/** Devuelve un mapa { cliente: autor } de todos los que están escribiendo ahora. */
function listarEscribiendo() {
  const resultado = {};
  for (const [cliente, entry] of escribiendo.entries()) {
    if (Date.now() <= entry.expira) {
      resultado[cliente] = entry.autor;
    }
  }
  return resultado;
}

module.exports = { marcarEscribiendo, quienEstaEscribiendo, listarEscribiendo };
