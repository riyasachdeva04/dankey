const { default: makeConn, DisconnectReason, BufferJSON, useMultiFileAuthState, MessageType, MessageOptions, Mimetype, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
var { Boom } = require('@hapi/boom');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');

const modelPath = '../model/dankey.py';

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
    var extendedTextMessage = messageObj?.message?.extendedTextMessage;
    var fullMessage = extendedTextMessage?.text;
    console.log(JSON.stringify(m, undefined, 2));
    console.log("message is:" + fullMessage);
    // console.log('Logged in to', m.messages[0].key.remoteJid);

    // Check if the message is a command
    if (fullMessage && fullMessage.startsWith('/dankey')) {
      try {
        // mark that message as recieved 
        const reactionMessage = {
          react: {
            text: "💖", // use an empty string to remove the reaction
            key: messageObj.key,
          },
        };

        // Extract the text after '/dankey '
        const commandText = fullMessage.split('/dankey ')[1];
        console.log("Extracted text: " + commandText);

        // Run Python script and wait for the meme link
        const memeLinkFromModel = await runPythonScript(commandText);
        console.log('Image link:', memeLinkFromModel);

        // For now, overwrite the image and send it everytime
        // Download the image and wait for it to be saved
        const memePath = './media/downloaded_meme.jpg'; // Path to meme image
        await downloadImage(memeLinkFromModel, memePath);

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
        await sockClient.sendMessage(messageObj.key.remoteJid, { text: "Error while sending meme: " + error });
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

// function to run the python script & pass it the input text as an arg
function runPythonScript(inputText) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [modelPath, inputText]);
    let output = '';

    pythonProcess.stdout.on('data', (data) => {
      console.log("Received data chunk:", data.toString());
      output += data.toString();
    });

    pythonProcess.on('close', () => {
      // Split the output by newlines and get the last non-empty line
      const lines = output.split('\n').filter(line => line.trim() !== '');
      const lastLine = lines[lines.length - 1];
      resolve(lastLine);
      console.log('Model Output is:', lastLine);
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error("Error from Python script:", data.toString());
      reject(data.toString());
    });
  });
}

// function to download the image using axios and save it
// !! CAN BE ABUSED
// this function returns a Promise
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url) {
      console.error('Invalid URL provided for download');
      return reject('Invalid URL');
    }

    axios({
      url,
      responseType: 'stream',
    }).then(response => {
      response.data.pipe(fs.createWriteStream(filepath))
      .on('finish', resolve)
      .on('error', reject);
    }).catch(error => {
      console.error('Error downloading the image:', error);
      reject(error);
    });
  });
}