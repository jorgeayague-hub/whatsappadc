// whatsapp.js — Envío de mensajes vía WhatsApp Cloud API (Meta)

const axios = require("axios");

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Envía un mensaje de texto a un número de WhatsApp.
 * @param {string} to - Número de destino en formato internacional (ej. 5492604123456)
 * @param {string} text - Contenido del mensaje
 */
async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    const detalle = err.response?.data?.error?.message || err.message;
    console.error("Error enviando mensaje de WhatsApp:", err.response?.data || err.message);
    // Antes este error quedaba solo en el log — ahora se lo pasamos a quien
    // llamó a esta función, para que el panel le avise a quien mandó el
    // mensaje que en realidad NO se entregó, en vez de mostrarlo como si
    // hubiera salido bien.
    throw new Error(`No se pudo enviar el mensaje por WhatsApp: ${detalle}`);
  }
}

module.exports = { sendWhatsAppMessage };
