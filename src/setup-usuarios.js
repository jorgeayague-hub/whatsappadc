// setup-usuarios.js — Correr una vez para crear los logins del panel
// (uno para vos, otro para tu socio). Se puede volver a correr cuando
// quieran: si el usuario ya existe, le pisa la clave.
//
// Modo interactivo (local, te pregunta usuario y clave):
//   node src/setup-usuarios.js
//
// Modo directo (para consolas remotas como la de Railway, que no
// siempre soportan bien las preguntas interactivas):
//   node src/setup-usuarios.js jorgeadc unaClaveDeAlMenos6

const readline = require("readline");
const { crearUsuario } = require("./auth");

const [usuarioArg, claveArg] = process.argv.slice(2);

function validarYCrear(usuario, clave) {
  usuario = (usuario || "").trim().toLowerCase();
  if (!usuario) {
    console.log("El usuario no puede estar vacío.");
    return;
  }
  if (!clave || clave.length < 6) {
    console.log("La clave tiene que tener al menos 6 caracteres.");
    return;
  }
  crearUsuario(usuario, clave);
  console.log(`\n✅ Usuario "${usuario}" guardado. Ya se puede entrar con eso en /login.html`);
}

if (usuarioArg) {
  // Modo directo: viene todo por argumentos, no hace preguntas.
  validarYCrear(usuarioArg, claveArg);
} else {
  // Modo interactivo: pregunta por consola, como antes.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const pregunta = (texto) => new Promise((resolve) => rl.question(texto, resolve));

  (async () => {
    console.log("Crear o actualizar un usuario del panel de Aires de Cuyo\n");
    const usuario = await pregunta("Usuario (ej: jorge): ");
    const clave = await pregunta("Clave (mínimo 6 caracteres): ");
    validarYCrear(usuario, clave);
    console.log("Corré este script de nuevo (con el mismo usuario u otro) para agregar a tu socio o cambiar una clave.");
    rl.close();
  })();
}
