const { default: makeConn, DisconnectReason, BufferJSON, useMultiFileAuthState, MessageType, MessageOptions, Mimetype, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
var { Boom } = require('@hapi/boom');
const fs = require('fs');

const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Default response!')
})

app.listen(port, () => {
  console.log(`Express app listening on port ${port}`)
})

var sockClient = "";
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_store');

  // console.log(makeConn);

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`🔧 using WA v${version.join(".")}, isLatest: ${isLatest}`);

  sockClient = makeConn({
    printQRInTerminal: true,
    auth: state // will use the given state to connect so if valid credentials are available -- it'll connect without QR
  });

  sockClient.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('opened connection');
      console.log('✨ Logged in to WhatsApp as', sockClient.user.name);
    }
  })

  sockClient.ev.on('creds.update', saveCreds);   // called when credentials are updated
  sockClient.ev.on('messages.upsert', async (m) => {
    var messageObj = m?.messages[0];
    var message = m?.messages[0].message?.conversation;
    console.log(JSON.stringify(m, undefined, 2));
    console.log("message is:" + message);
    // console.log('Logged in to', m.messages[0].key.remoteJid);

    // Check if the message is a command
    if (message && message.startsWith('/dankey')) {
      // add contextual analysis here -- integrate with model
      var memeImageFromModel
      // For now, just sending a predefined meme
      const memePath = './media/shutup.jpg'; // Path to your meme image
      try {
        const imageMessage = {
          image: { url: memePath },
          caption: "Here's your meme!" // Optional caption for the image
        };
        await sockClient.sendMessage(
          messageObj.key.remoteJid,
          imageMessage
        );
        console.log('Sent meme!');
      } catch (error) {
        console.error('Failed to send meme:', error);
      }
    }
  });
}

connectToWhatsApp();

function getJid(phone) {
  phone += "";
  var length = [...phone].length;;
  if (length == 10) {
    phone = "91" + phone;
  }

  if (!phone.includes('@s.whatsapp.net')) {
    phone = `${phone}@s.whatsapp.net`;
  }

  return phone;
}
