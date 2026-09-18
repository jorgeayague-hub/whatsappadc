// setup-usuarios.js — Correr una vez para crear los logins del panel
// (uno para vos, otro para tu socio). Se puede volver a correr cuando
// quieran: si el usuario ya existe, le pisa la clave.
//
//   node src/setup-usuarios.js

const readline = require("readline");
const { crearUsuario } = require("./auth");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pregunta = (texto) => new Promise((resolve) => rl.question(texto, resolve));

(async () => {
  console.log("Crear o actualizar un usuario del panel de Aires de Cuyo\n");

  const usuario = (await pregunta("Usuario (ej: jorge): ")).trim().toLowerCase();
  if (!usuario) {
    console.log("El usuario no puede estar vacío.");
    rl.close();
    return;
  }

  const clave = await pregunta("Clave (mínimo 6 caracteres): ");
  if (!clave || clave.length < 6) {
    console.log("La clave tiene que tener al menos 6 caracteres.");
    rl.close();
    return;
  }

  crearUsuario(usuario, clave);
  console.log(`\n✅ Usuario "${usuario}" guardado. Ya se puede entrar con eso en /login.html`);
  console.log("Corré este script de nuevo (con el mismo usuario u otro) para agregar a tu socio o cambiar una clave.");
  rl.close();
})();
