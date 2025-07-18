"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const config_1 = require("./config");
const REGISTERED_FILE = 'registered.json';
const BOTNAMES_FILE = 'botnames.json';
const serverIp = process.argv[2] || 'localhost';
const numBots = parseInt(process.argv[3]) || 8;
const botStatusMap = new Map();
const connected = [];
let children = [];
function getRegisteredAccounts() {
    if (!fs_1.default.existsSync(REGISTERED_FILE))
        return [];
    return JSON.parse(fs_1.default.readFileSync(REGISTERED_FILE, 'utf8'));
}
async function getRandomSocksProxy() {
    const url = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=3000&country=all';
    const res = await (0, node_fetch_1.default)(url);
    const body = await res.text();
    return body
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `socks4://${p}`);
}
function getAvailableNames() {
    return JSON.parse(fs_1.default.readFileSync(BOTNAMES_FILE, 'utf8'));
}
function generateRandomBotName(index, usedNames, pool) {
    for (const baseName of pool) {
        let finalName = baseName;
        let suffix = 1;
        while (usedNames.has(finalName)) {
            finalName = `${baseName}${suffix++}`;
        }
        usedNames.add(finalName);
        return finalName;
    }
    return `FallbackBot${index}`;
}
(async () => {
    const proxies = await getRandomSocksProxy();
    const registeredAccounts = getRegisteredAccounts();
    const botsToLaunch = [];
    registeredAccounts.slice(0, numBots).forEach(acc => {
        botsToLaunch.push({ name: acc.name });
    });
    const namePool = getAvailableNames();
    const usedNames = new Set(botsToLaunch.map(b => b.name));
    let index = 0;
    while (botsToLaunch.length < numBots) {
        const name = generateRandomBotName(index++, usedNames, namePool);
        botsToLaunch.push({ name });
    }
    const config = (0, config_1.loadConfig)(namePool[0]);
    const saveChatLogs = config.logging?.saveChatLogs ?? false;
    const logsFolder = config.logging?.logsFolder ?? './logs';
    if (saveChatLogs && !fs_1.default.existsSync(logsFolder)) {
        fs_1.default.mkdirSync(logsFolder, { recursive: true });
    }
    function getLogFileName(botName) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        return `${logsFolder}/${botName}-${dateStr}.log`;
    }
    botsToLaunch.forEach((bot, i) => {
        const proxy = proxies[i % proxies.length];
        const child = (0, child_process_1.fork)('dist/botProcess.js', [bot.name, proxy, String(i * 10000), serverIp]);
        connected.push({ name: bot.name, child });
        children.push(child);
        child.on('message', (msg) => {
            if (typeof msg === 'object' && msg !== null && 'type' in msg) {
                if (msg.type === 'status') {
                    const data = msg.data;
                    botStatusMap.set(data.name, data);
                    if (!useGlobal && connected[selectedBotIndex]?.name === data.name) {
                        refreshStatus();
                    }
                }
                else if (msg.type === 'log' || msg.type === 'chat') {
                    console.log(msg.message);
                    if (saveChatLogs) {
                        const botName = connected.find(c => c.child === child)?.name ?? 'unknown';
                        const logFile = getLogFileName(botName);
                        const logLine = `[${new Date().toISOString()}] ${msg.message}\n`;
                        fs_1.default.appendFile(logFile, logLine, err => {
                            if (err)
                                console.error(`Error saving log for ${botName}:`, err);
                        });
                    }
                }
            }
        });
    });
    readline_1.default.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY)
        process.stdin.setRawMode(true);
    let chatMode = false;
    let chatBuffer = '';
    let selectedBotIndex = 0;
    let useGlobal = true;
    function refreshStatus() {
        console.clear();
        console.log(`🧠 Bots conectados: ${connected.length}/${numBots}`);
        console.log(`🎯 Modo actual: ${useGlobal ? 'Global (TODOS)' : `Individual → ${connected[selectedBotIndex]?.name || 'Ninguno'}`}`);
        console.log(`🔁 Flechas Izq/Der: Cambiar bot • Flecha Arriba: Añadir bot • Flecha Abajo: Desconectar bot`);
        console.log(`💬 't' para escribir mensaje, 'WASD' o 'space' para mover`);
        if (!useGlobal && connected[selectedBotIndex]) {
            const botName = connected[selectedBotIndex].name;
            const status = botStatusMap.get(botName);
            if (status) {
                console.log(`\n📊 Estado del bot: ${botName}`);
                console.log(`❤️ Vida: ${status.health} | 🍗 Comida: ${status.food} | 📈 XP: ${status.xp} | ⏳ ${status.uptime}s`);
                console.log(`📍 Pos: x=${status.position.x}, y=${status.position.y}, z=${status.position.z}`);
                console.log(`🌍 Mundo: ${status.world}`);
                console.log(`🪓 Objeto: ${status.heldItem}`);
                console.log(`🎒 Inventario:\n${status.inventory.map((i) => `   - ${i}`).join('\n')}`);
            }
            else {
                console.log(`\n⏳ Esperando datos del bot...`);
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
                process.stdout.clearLine(0);
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
        const moveKeys = ['w', 'a', 's', 'd', 'space'];
        if (moveKeys.includes(key.name)) {
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
            const available = registeredAccounts.filter(acc => !connected.some(c => c.name === acc.name));
            if (available.length === 0) {
                console.log('\n❌ No bots available to add.');
                return;
            }
            const next = available[0];
            const proxy = proxies[children.length % proxies.length];
            const child = (0, child_process_1.fork)('dist/botProcess.js', [next.name, proxy, String(children.length * 10000), serverIp]);
            connected.push({ name: next.name, child });
            children.push(child);
            selectedBotIndex = connected.length - 1;
            child.on('message', (msg) => {
                if (typeof msg === 'object' && msg !== null && 'type' in msg) {
                    if (msg.type === 'status') {
                        const data = msg.data;
                        botStatusMap.set(data.name, data);
                        if (!useGlobal && connected[selectedBotIndex]?.name === data.name)
                            refreshStatus();
                    }
                    else if (msg.type === 'log') {
                        console.log(msg.message);
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
                connected.splice(selectedBotIndex, 1);
                children.splice(selectedBotIndex, 1);
                if (selectedBotIndex >= connected.length)
                    selectedBotIndex = Math.max(0, connected.length - 1);
                refreshStatus();
            }
            return;
        }
    });
})();
