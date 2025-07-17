import { createBot, Bot, ControlState } from 'mineflayer';
import { ProxyAgent } from 'proxy-agent';
import fs from 'fs';
import { getMessageWithAnsi, wait } from './utils';
import { CommandMessage } from './types';
import { loadConfig } from './config';

const [,, name, proxyUrl, delayArg, serverIp = 'localhost'] = process.argv;
const delay = parseInt(delayArg);
const REGISTERED_FILE = 'registered.json';

let bot: Bot;
const config = loadConfig(name);
let startTime = Date.now();
const triggeredResponses = new Set<string>();

const authConfig = config.auth!;
const requireAuth = authConfig.requireAuth ?? false;
const authSuccessMessage = (authConfig.authSuccessMessage ?? "").toLowerCase();
const loginTriggerMessages = (authConfig.loginTriggerMessages ?? []).map(m => m.toLowerCase());
const registerTriggerMessages = (authConfig.registerTriggerMessages ?? []).map(m => m.toLowerCase());
const loginCommand = authConfig.loginCommand ?? "/login {{password}}";
const registerCommand = authConfig.registerCommand ?? "/register {{password}} {{password}}";

let isAuthenticated = !requireAuth;
let isReady = false;
let hasTriedAuth = false;
let onJoinExecuted = false;
let hasJoinedWorld = false;
let hasStartedStatus = false;

function applyVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

function markAsRegistered(botName: string, password: string) {
  let registered: { name: string, password: string }[] = [];

  if (fs.existsSync(REGISTERED_FILE)) {
    registered = JSON.parse(fs.readFileSync(REGISTERED_FILE, 'utf8'));
  }

  if (!registered.some(acc => acc.name === botName)) {
    registered.push({ name: botName, password });
    fs.writeFileSync(REGISTERED_FILE, JSON.stringify(registered, null, 2));
    console.log(`✅ ${botName} saved as registered`);
  }
}

function startStatusInterval() {
  if (hasStartedStatus) return;
  hasStartedStatus = true;

  setInterval(() => {
    if (!bot?.entity) return;
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
}

async function runActions(actions: any[]) {
  const vars = config.variables || {};
  const validMoves = ['forward', 'left', 'back', 'right', 'jump'];

  for (const action of actions) {
    try {
      while (!isReady || !isAuthenticated) await wait(250);

      if (action.say) {
        const msg = applyVariables(action.say, vars).trim();
        if (msg && bot?.player) bot.chat(msg);
      }

      if (action.command) {
        const cmd = applyVariables(action.command, vars).trim();
        if (/^[a-z/]/i.test(cmd) && bot?.player) {
          bot.chat(cmd.startsWith('/') ? cmd : `/${cmd}`);
        }
      }

      if (action.move && validMoves.includes(action.move) && bot?.entity) {
        const duration = Number(action.duration) || 300;
        bot.setControlState(action.move, true);
        await wait(duration);
        bot.setControlState(action.move, false);
      }

      if (action.delay) await wait(Number(action.delay));
      if (action.register) markAsRegistered(name, config.variables.password);
      if (action.quit) {
        bot.quit();
        break;
      }

      await wait(100);
    } catch (err) {
      console.warn(`[${name}] Error ejecutando acción:`, err);
    }
  }
}

function runBot() {
  bot = createBot({
    host: serverIp,
    port: 25565,
    username: name,
    agent: proxyUrl ? new ProxyAgent(proxyUrl as any) : undefined,
    version: '1.21.1',
    auth: 'offline',
  });

  bot.once('spawn', async () => {
    console.log(`${name} connected via proxy: ${proxyUrl}`);
    await waitUntilStablePosition(bot);
    process.send?.({ type: 'connected' });

    if (!requireAuth) {
      isAuthenticated = true;
    }
  });

  bot.on('game', async () => {
    if (!hasJoinedWorld) {
      hasJoinedWorld = true;
      console.log(`[${name}] Bot has joined the world.`);
      isReady = true;

      if (isAuthenticated && !onJoinExecuted) {
        await runActions(config.onJoin);
        onJoinExecuted = true;
        startTime = Date.now();
        startStatusInterval();
      }
    }
  });

  bot.on('message', async (message) => {
  const text = message.toString();
  const fullText = getMessageWithAnsi(message);
  process.send?.({ type: 'log', message: `[${name}] ${fullText}` });

    if (requireAuth && !isAuthenticated) {
      if (registerTriggerMessages.some(trigger => text.includes(trigger))) {
        if (!hasTriedAuth) {
          bot.chat(applyVariables(registerCommand, config.variables));
          hasTriedAuth = true;
        }
        return;
      }

      if (loginTriggerMessages.some(trigger => text.includes(trigger))) {
        if (!hasTriedAuth) {
          bot.chat(applyVariables(loginCommand, config.variables));
          hasTriedAuth = true;
        }
        return;
      }

      if (text.includes(authSuccessMessage)) {
        isAuthenticated = true;
        console.log(`[${name}] Autenticación exitosa.`);

        if (hasJoinedWorld && !onJoinExecuted) {
          await runActions(config.onJoin);
          onJoinExecuted = true;
          startTime = Date.now();
          startStatusInterval();
        }

        return;
      }

      return;
    }

    if (!requireAuth && hasJoinedWorld && !hasStartedStatus) {
      startTime = Date.now();
      startStatusInterval();
    }

    if (!isReady || (requireAuth && !isAuthenticated)) return;

    for (const r of config.responses || []) {
      const condition = r.if.toLowerCase();
      const once = r.once ?? true;

      if (text.includes(condition) && (!once || !triggeredResponses.has(condition))) {
        if (once) triggeredResponses.add(condition);
        runActions([r]);
      }
    }
  });

  bot.on('kicked', reason => {
    const parsed = typeof reason === 'string' ? reason : JSON.stringify(reason, null, 2);
    console.log(`${name} kicked:\n`, parsed);
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

process.on('message', (command: CommandMessage) => {
  if (!bot?.player?.entity) return;

  const keyMap: Record<string, string> = {
    w: 'forward',
    a: 'left',
    s: 'back',
    d: 'right',
    space: 'jump'
  };

  try {
    if (command.type === 'chat' && command.message?.trim()) {
      bot.chat(command.message.trim());
    }

    if (command.type === 'keydown' && keyMap[command.key!]) {
      bot.setControlState(keyMap[command.key!] as ControlState, true);
    }

    if (command.type === 'keyup' && keyMap[command.key!]) {
      bot.setControlState(keyMap[command.key!] as ControlState, false);
    }
  } catch (err) {
    console.warn(`[${name}] Error procesando comando remoto:`, err);
  }
});

async function waitUntilStablePosition(bot: Bot) {
  console.log(`[${bot.username}] Esperando posición estable...`);

  while (!bot.entity || !bot.entity.position) {
    await wait(100);
  }

  let stableCount = 0;
  let lastPos = bot.entity.position.clone();

  while (stableCount < 2) {
    await wait(200);
    const currentPos = bot.entity?.position;

    if (lastPos && currentPos && currentPos.distanceTo(lastPos) < 0.01) {
      stableCount++;
    } else {
      stableCount = 0;
    }

    lastPos = currentPos.clone();
  }

  console.log(`[${bot.username}] Stable position detected. Ready to run actions.`);
}
