# Panel de atención — Aires de Cuyo

Sistema propio (sin IA generativa por ahora) para atender los mensajes de
WhatsApp del negocio desde un único número, entre dos personas (Jorge y su
socio), sin que ninguno necesite tener WhatsApp conectado con su celular
personal.

## Cómo funciona

- Un solo número de WhatsApp Business (Meta) recibe todos los mensajes.
- Cada mensaje que llega queda guardado en una bandeja compartida.
- Jorge y su socio entran al panel web, ven todos los chats en vivo, y
  responden manualmente — el mensaje sale del número oficial del negocio.
- La bandeja se actualiza sola cada pocos segundos; cuando alguien está
  escribiendo en un chat, el otro lo ve en tiempo real para no pisarse.
- Los pedidos que se levantan en una conversación se cargan a mano en la
  pestaña "Pedidos"; de ahí se arma la orden de compra consolidada por
  proveedor, igual que antes.
- Notificaciones push al celular cuando llega un mensaje nuevo (no hace
  falta tener la pestaña abierta).

No hay IA respondiendo sola. Quedó pensado como paso siguiente si el
volumen de clientes lo justifica más adelante — la base de datos de
mensajes y clientes ya queda armada para que, llegado el momento, se
pueda sumar sin rehacer nada.

## Instalación

```bash
npm install
```

## Configuración

Copiá `.env.example` a `.env` y completá:

1. **WhatsApp Business API** (Meta for Developers):
   - Entrá a [developers.facebook.com](https://developers.facebook.com),
     creá una app tipo "Business" y agregale el producto "WhatsApp".
   - Meta te da un número de prueba para arrancar (después se puede
     pasar a un número real del negocio).
   - Copiá el "Token de acceso temporal" → `WHATSAPP_TOKEN`.
   - Copiá el "ID del número de teléfono" → `WHATSAPP_PHONE_NUMBER_ID`.
   - Elegí vos cualquier texto para `WHATSAPP_VERIFY_TOKEN` y usá ese
     mismo texto al configurar el Webhook del lado de Meta, apuntando a
     `https://<tu-servidor>/webhook`.
2. **Notificaciones push**: generá las claves una sola vez con
   ```bash
   npx web-push generate-vapid-keys
   ```
   y pegá el resultado en `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`.
3. **Usuarios del panel** (login para vos y tu socio):
   ```bash
   node src/setup-usuarios.js
   ```
   Te pide un usuario y una clave y los guarda hasheados. Corré el script
   una vez por persona (así los dos tienen su propio login). Se puede
   volver a correr cuando quieran para cambiar una clave.

## Probar sin WhatsApp real

Mientras no esté conectado el número de WhatsApp, se puede probar toda la
lógica de pedidos y orden de compra con datos de ejemplo:

```bash
node src/test-purchasing.js
```

Y levantar el panel para ver la interfaz (sin mensajes reales todavía):

```bash
npm run dev
# abrir http://localhost:3000/dashboard.html
```

## Instalar el panel como app en el celular (para las notificaciones push)

1. Abrir `http://<tu-servidor>/dashboard.html` desde Chrome (Android) o
   Safari (iPhone).
2. Menú del navegador → "Agregar a pantalla de inicio" / "Añadir a
   inicio".
3. Abrir el ícono que queda instalado y activar el tilde "Avisarme
   mensajes nuevos" arriba a la derecha.

## Subir a producción

1. **Repositorio**: subí el proyecto a un repo de GitHub (privado). El
   `.gitignore` ya excluye el `.env` y los datos reales del negocio.
2. **Hosting**: Railway o Render. Conectás el repo y detecta solo que es
   Node — no hay que tocar nada, `package.json` ya tiene el comando de
   arranque.
3. **Disco persistente — importante**: configurá un volumen (Railway) o
   disco persistente (Render) apuntando a `src/data/`. Sin esto, los
   mensajes, pedidos y usuarios se borran en cada redeploy.
4. **Variables de entorno**: cargá en el panel del hosting las mismas
   que tenés en tu `.env` local.
5. **Webhook de WhatsApp**: con la URL pública que te da el hosting,
   completá la configuración del Webhook en Meta for Developers como se
   explica arriba, usando `<tu-url>/webhook`.

## Pendiente

- Conseguir el número de WhatsApp Business separado del personal y
  darlo de alta en Meta for Developers (pasos arriba).
- Página web pública para clientes nuevos (más adelante, una vez que el
  panel interno esté validado con los clientes actuales).
