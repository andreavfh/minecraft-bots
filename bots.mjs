import { fork } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import readline from 'readline';

const REGISTERED_FILE = 'registered.json';
const serverIp = process.argv[2] || 'localhost';
const numBots = parseInt(process.argv[3]) || 8;

const botStatusMap = new Map(); // Estado de cada bot

function getRegisteredAccounts() {
  if (!fs.existsSync(REGISTERED_FILE)) return [];
  return JSON.parse(fs.readFileSync(REGISTERED_FILE));
}

async function getRandomSocksProxy() {
  const url = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=3000&country=all';
  const res = await fetch(url);
  const body = await res.text();

  return body
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `socks4://${p}`);
}

function getAvailableNames() {
  const raw = fs.readFileSync('botnames.json');
  return JSON.parse(raw);
}

function generateRandomBotName(index, usedNames, namePool) {
  for (let baseName of namePool) {
    let finalName = baseName;
    let suffix = 1;
    while (usedNames.has(finalName)) {
      finalName = `${baseName}${suffix++}`;
    }
    usedNames.add(finalName);
    return finalName;
  }
  return `fallbackBot${index}`;
}

const connected = [];
let children = [];

(async () => {
  const proxies = await getRandomSocksProxy();
  const registeredAccounts = getRegisteredAccounts();

  const botsToLaunch = [];

  registeredAccounts.slice(0, numBots).forEach(acc => {
    botsToLaunch.push({ name: acc.name, password: acc.password });
  });

  const namePool = getAvailableNames();
  const usedNames = new Set(botsToLaunch.map(b => b.name));
  let index = 0;

  while (botsToLaunch.length < numBots) {
    const name = generateRandomBotName(index++, usedNames, namePool);
    botsToLaunch.push({ name, password: 'dubai' });
  }

  botsToLaunch.forEach((bot, i) => {
    const proxy = proxies[i % proxies.length];
    const child = fork('index.js', [bot.name, bot.password, proxy, i * 10000, serverIp]);
    connected.push({ name: bot.name, child });
    children.push(child);

    // Escuchar mensajes de estado
    child.on('message', msg => {
      if (msg.type === 'status') {
        botStatusMap.set(msg.data.name, msg.data);
        if (!useGlobal && connected[selectedBotIndex]?.name === msg.data.name) {
          refreshStatus();
        }
      }
    });
  });

  // 🎮 Interacción
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  let chatMode = false;
  let chatBuffer = '';
  let selectedBotIndex = 0;
  let useGlobal = true;

  function refreshStatus() {
    console.clear();
    console.log(`🧠 Bots conectados: ${connected.length}/${numBots}`);
    console.log(`🎯 Modo actual: ${useGlobal ? 'Global (TODOS los bots)' : `Individual → ${connected[selectedBotIndex]?.name || 'Ninguno'}`}`);
    console.log(`🔁 Flechas Izq/Der: Cambiar bot • Flecha Arriba: Añadir bot • Flecha Abajo: Desconectar bot`);
    console.log(`💬 't' para escribir mensaje, 'WASD' o 'space' para mover`);

    if (!useGlobal && connected[selectedBotIndex]) {
      const botName = connected[selectedBotIndex].name;
      const status = botStatusMap.get(botName);

      if (status) {
        console.log(`\n📊 Estado del bot: ${botName}`);
        console.log(`❤️ Vida: ${status.health}`);
        console.log(`🍗 Comida: ${status.food}`);
        console.log(`📍 Posición: x=${status.position.x}, y=${status.position.y}, z=${status.position.z}`);
        console.log(`🌍 Mundo: ${status.world}`);
        console.log(`🪓 Objeto en mano: ${status.heldItem}`);
        console.log(`🎒 Inventario:`);
        status.inventory.forEach(item => console.log(`   - ${item}`));
        console.log(`📈 XP: ${status.xp}`);
        console.log(`⏳ Tiempo conectado: ${status.uptime}s`);
      } else {
        console.log(`\n⏳ Cargando estado del bot...`);
      }
    }
  }

  refreshStatus();

  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      console.log('\nSaliendo...');
      process.exit();
    }

    if (chatMode) {
      if (key.name === 'return') {
        const target = useGlobal ? children : [children[selectedBotIndex]];
        target.forEach(child => child.send({ type: 'chat', message: chatBuffer }));
        console.log(`\n📤 Mensaje enviado: ${chatBuffer}`);
        chatBuffer = '';
        chatMode = false;
        return;
      }
      if (key.name === 'backspace') {
        chatBuffer = chatBuffer.slice(0, -1);
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write('Chat: ' + chatBuffer);
        return;
      }
      if (str && str.length === 1) {
        chatBuffer += str;
        process.stdout.write(str);
      }
      return;
    }

    if (key.name === 't') {
      chatMode = true;
      chatBuffer = '';
      process.stdout.write('\n💬 Escribe mensaje (Enter para enviar):\nChat: ');
      return;
    }

    const movementKeys = ['w', 'a', 's', 'd', 'space'];
    if (movementKeys.includes(key.name)) {
      const target = useGlobal ? children : [children[selectedBotIndex]];
      target.forEach(child => child.send({ type: 'keydown', key: key.name }));
      setTimeout(() => {
        target.forEach(child => child.send({ type: 'keyup', key: key.name }));
      }, 300);
      return;
    }

    if (key.name === 'tab') {
      useGlobal = !useGlobal;
      refreshStatus();
      return;
    }

    if (key.name === 'left') {
      selectedBotIndex = (selectedBotIndex - 1 + connected.length) % connected.length;
      refreshStatus();
      return;
    }

    if (key.name === 'right') {
      selectedBotIndex = (selectedBotIndex + 1) % connected.length;
      refreshStatus();
      return;
    }

    if (key.name === 'up') {
      const available = registeredAccounts.filter(acc =>
        !connected.some(c => c.name === acc.name)
      );
      if (available.length === 0) {
        console.log('\n❌ No hay bots disponibles para agregar.');
        return;
      }

      const next = available[0];
      const proxy = proxies[children.length % proxies.length];
      const child = fork('index.js', [next.name, next.password, proxy, children.length * 10000]);
      connected.push({ name: next.name, child });
      children.push(child);
      selectedBotIndex = connected.length - 1;

      child.on('message', msg => {
        if (msg.type === 'status') {
          botStatusMap.set(msg.data.name, msg.data);
          if (!useGlobal && connected[selectedBotIndex]?.name === msg.data.name) {
            refreshStatus();
          }
        }
      });

      refreshStatus();
      return;
    }

    if (key.name === 'down') {
      const bot = connected[selectedBotIndex];
      if (bot) {
        bot.child.kill();
        console.log(`\n🔌 Desconectado bot: ${bot.name}`);
        connected.splice(selectedBotIndex, 1);
        children.splice(selectedBotIndex, 1);
        if (selectedBotIndex >= connected.length) selectedBotIndex = Math.max(0, connected.length - 1);
        refreshStatus();
      }
      return;
    }
  });
})();
