import { createBot } from 'mineflayer';
import * as ProxyAgentModule from 'proxy-agent';
import fs from 'fs';
import YAML from 'yaml';

const [,, name, password, proxyUrl, delay, serverIp = 'localhost'] = process.argv;
const REGISTERED_FILE = 'registered.json';
const CONFIG_FILE = 'setup.yaml';

let config = { variables: {}, onJoin: [], responses: [] };
let bot;

// Cargar configuración desde YAML
if (fs.existsSync(CONFIG_FILE)) {
  const file = fs.readFileSync(CONFIG_FILE, 'utf8');
  config = YAML.parse(file);
}

// Agregar la variable "password" desde args si no está
config.variables = config.variables || {};
if (!config.variables.password) config.variables.password = password;

// 🧩 Reemplaza {{variables}} en strings
function applyVariables(str, vars) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{(.*?)\}\}/g, (_, v) => vars[v.trim()] ?? '');
}

// 💾 Guarda cuenta en registered.json
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

// 🚀 Ejecuta bot
function runBot() {
  bot = createBot({
    host: serverIp,
    port: 25565,
    username: name,
    agent: new ProxyAgentModule.ProxyAgent(proxyUrl),
    version: '1.21.1',
  });

  bot.once('spawn', () => {
    console.log(`${name} conectado desde proxy: ${proxyUrl}`);
    process.send?.('connected');
    runActions(config.onJoin);
  });

  bot.on('message', (message) => {
    const msg = message.toString();
    console.log(`${name} mensaje: ${msg}`);

    for (const response of config.responses || []) {
      if (msg.toLowerCase().includes(response.if.toLowerCase())) {
        runActions([response]);
      }
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

  bot.on('error', err => {
    console.log(`${name} error: ${err.message}`);
  });
}

// ⏱️ Esperar
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runActions(actions) {
  const vars = config.variables || {};
  const validMoves = ['forward', 'left', 'back', 'right', 'jump'];

  for (const action of actions) {
    if (action.say) {
      bot.chat(applyVariables(action.say, vars));
    }

    if (action.command) {
      const cmd = applyVariables(action.command, vars);
      bot.chat(cmd.startsWith('/') ? cmd : `/${cmd}`);
    }

    if (action.move && validMoves.includes(action.move)) {
      console.log(`${name} moviéndose hacia ${action.move} por ${action.duration || 300}ms`);
      bot.setControlState(action.move, true);
      await wait(action.duration || 300);
      bot.setControlState(action.move, false);
    }

    if (action.delay) {
      await wait(action.delay);
    }

    if (action.register) {
      markAsRegistered(name, password);
    }

    if (action.quit) {
      bot.quit();
      break;
    }
  }
}


setTimeout(runBot, Number(delay) || 0);

// 🎮 Control externo desde bots.mjs
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
