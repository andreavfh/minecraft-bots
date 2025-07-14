import { createBot } from 'mineflayer';
import * as ProxyAgentModule from 'proxy-agent';
import fs from 'fs';

const [,, name, password, proxyUrl, delay, serverIp = 'localhost', messageToSay = ''] = process.argv;
const REGISTERED_FILE = 'registered.json';

let bot;

function markAsRegistered(botName, password) {
  let registered = [];

  if (fs.existsSync(REGISTERED_FILE)) {
    registered = JSON.parse(fs.readFileSync(REGISTERED_FILE));
  }

  if (!registered.some(acc => acc.name === botName)) {
    registered.push({ name: botName, password });
    fs.writeFileSync(REGISTERED_FILE, JSON.stringify(registered, null, 2));
    console.log(`✅ ${botName} guardado como registrado`);
  }
}

function runBot() {
  bot = createBot({
    host: serverIp,
    port: 25565,
    username: name,
    agent: new ProxyAgentModule.ProxyAgent(proxyUrl),
    version: '1.20.4',
  });

  bot.once('spawn', () => {
    console.log(`${name} conectado desde proxy: ${proxyUrl}`);
    process.send?.('connected');
  });

  bot.on('message', (message) => {
    const msg = message.toString();
    console.log(`${name} mensaje: ${msg}`);

    if (msg.includes('Has superado el número máximo de registros')) {
      console.log(`${name} → PROXY BLOQUEADO`);
      bot.quit();
      return;
    }

    if (
      msg.includes('Ya se ha registrado una cuenta') ||
      msg.includes('inicie sesión') ||
      msg.includes('/login')
    ) {
      bot.chat(`/login ${password}`);
      return;
    }

    if (msg.includes('/register')) {
      bot.chat(`/register ${password} ${password}`);
      return;
    }

    if (msg.includes('Acceso exitoso')) {
      markAsRegistered(name, password);
    }
  });

  bot.on('kicked', reason => {
    console.log(`${name} expulsado: ${reason}`);
    process.send?.('disconnected');
  });

  bot.on('end', () => {
    console.log(`${name} se desconectó`);
    process.send?.('disconnected');
  });

  bot.on('error', err => console.log(`${name} error: ${err.message}`));
}

setTimeout(runBot, Number(delay) || 0);

// 🎮 Control externo
process.on('message', (command) => {
  if (!bot || !bot.player || !bot.entity) return;

  const keyMap = {
    w: 'forward',
    a: 'left',
    s: 'back',
    d: 'right',
    space: 'jump'
  };

  if (typeof command === 'object' && command !== null) {
    const { type, key, message } = command;

    switch (type) {
      case 'chat':
        if (typeof message === 'string') {
          bot.chat(message);
        }
        break;

      case 'keydown':
        if (keyMap[key]) {
          bot.setControlState(keyMap[key], true);
        }
        break;

      case 'keyup':
        if (keyMap[key]) {
          bot.setControlState(keyMap[key], false);
        }
        break;
    }
  }
});
