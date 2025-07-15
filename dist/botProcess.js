"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mineflayer_1 = require("mineflayer");
const proxy_agent_1 = require("proxy-agent");
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const utils_1 = require("./utils");
const [, , name, password, proxyUrl, delayArg, serverIp = 'localhost'] = process.argv;
const delay = parseInt(delayArg);
const REGISTERED_FILE = 'registered.json';
let bot;
const config = (0, config_1.loadConfig)(password);
const startTime = Date.now();
function markAsRegistered(botName, password) {
    let registered = [];
    if (fs_1.default.existsSync(REGISTERED_FILE)) {
        registered = JSON.parse(fs_1.default.readFileSync(REGISTERED_FILE, 'utf8'));
    }
    if (!registered.some(acc => acc.name === botName)) {
        registered.push({ name: botName, password });
        fs_1.default.writeFileSync(REGISTERED_FILE, JSON.stringify(registered, null, 2));
        console.log(`✅ ${botName} saved as registered`);
    }
}
async function runActions(actions) {
    const vars = config.variables || {};
    const validMoves = ['forward', 'left', 'back', 'right', 'jump'];
    for (const action of actions) {
        if (action.say)
            bot.chat((0, config_1.applyVariables)(action.say, vars));
        if (action.command) {
            const cmd = (0, config_1.applyVariables)(action.command, vars);
            bot.chat(cmd.startsWith('/') ? cmd : `/${cmd}`);
        }
        if (action.move && validMoves.includes(action.move)) {
            bot.setControlState(action.move, true);
            await (0, utils_1.wait)(action.duration || 300);
            bot.setControlState(action.move, false);
        }
        if (action.delay)
            await (0, utils_1.wait)(action.delay);
        if (action.register)
            markAsRegistered(name, password);
        if (action.quit) {
            bot.quit();
            break;
        }
    }
}
function runBot() {
    bot = (0, mineflayer_1.createBot)({
        host: serverIp,
        port: 25565,
        username: name,
        agent: proxyUrl ? new proxy_agent_1.ProxyAgent(proxyUrl) : undefined,
        version: '1.21.1',
    });
    bot.once('spawn', () => {
        console.log(`${name} connected via proxy: ${proxyUrl}`);
        process.send?.({ type: 'connected' });
        runActions(config.onJoin);
        setInterval(() => {
            if (!bot?.entity)
                return;
            const pos = bot.entity.position;
            const inventory = bot.inventory.items().map(i => `${i.name} x${i.count}`);
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            process.send?.({
                type: 'status',
                data: {
                    name: bot.username,
                    health: bot.health,
                    food: bot.food,
                    position: {
                        x: pos.x.toFixed(1),
                        y: pos.y.toFixed(1),
                        z: pos.z.toFixed(1),
                    },
                    world: bot.game?.dimension ?? 'unknown',
                    heldItem: bot.heldItem?.name ?? 'none',
                    inventory,
                    xp: bot.experience.level,
                    uptime
                }
            });
        }, 3000);
    });
    bot.on('message', msg => {
        const text = msg.toString();
        console.log(`[${name}] ${text}`);
        process.send?.({ type: 'log', message: `[${name}] ${text}` });
        for (const r of config.responses || []) {
            if (text.toLowerCase().includes(r.if.toLowerCase()))
                runActions([r]);
        }
    });
    bot.on('kicked', reason => {
        console.log(`${name} kicked: ${reason}`);
        process.send?.({ type: 'disconnected' });
    });
    bot.on('end', () => {
        console.log(`${name} disconnected`);
        process.send?.({ type: 'disconnected' });
    });
    bot.on('error', err => {
        console.log(`${name} error: ${err.message}`);
    });
}
setTimeout(runBot, delay || 0);
process.on('message', (command) => {
    if (!bot?.player?.entity)
        return;
    const keyMap = {
        w: 'forward',
        a: 'left',
        s: 'back',
        d: 'right',
        space: 'jump'
    };
    if (command.type === 'chat' && command.message) {
        bot.chat(command.message);
    }
    if (command.type === 'keydown' && keyMap[command.key]) {
        bot.setControlState(keyMap[command.key], true);
    }
    if (command.type === 'keyup' && keyMap[command.key]) {
        bot.setControlState(keyMap[command.key], false);
    }
});
