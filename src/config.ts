import fs from 'fs';
import YAML from 'yaml';

const CONFIG_FILE = 'setup.yaml';
const REGISTERED_FILE = 'registered.json';
const DEFAULT_PASSWORD = 'dubai';

export interface Config {
  variables: Record<string, string>;
  onJoin: any[];
  responses: any[];
  logging?: {
    saveChatLogs?: boolean;
    logsFolder?: string;
  };
  auth?: {
    requireAuth?: boolean;
    authSuccessMessage?: string;
    loginTriggerMessages?: string[];
    registerTriggerMessages?: string[];
    loginCommand?: string;
    registerCommand?: string;
  };
}

export function loadConfig(botName: string): Config {
  const file = fs.readFileSync(CONFIG_FILE, 'utf8');
  const parsed = YAML.parse(file) || {};

  parsed.variables ??= {};
  parsed.responses ??= [];
  parsed.onJoin ??= [];
  parsed.auth ??= {};

  // Leer passwords registradas
  let registeredPassword: string | undefined;
  if (fs.existsSync(REGISTERED_FILE)) {
    try {
      const registered = JSON.parse(fs.readFileSync(REGISTERED_FILE, 'utf8')) as { name: string; password: string }[];
      const found = registered.find(acc => acc.name === botName);
      if (found && found.password) {
        registeredPassword = found.password;
      }
    } catch (e) {
      console.warn(`Error leyendo ${REGISTERED_FILE}:`, e);
    }
  }

  // Priorizar contraseña en registered.json si existe
  if (registeredPassword) {
    parsed.variables.password = registeredPassword;
  } else if (!parsed.variables.password) {
    parsed.variables.password = DEFAULT_PASSWORD;
  }

  parsed.auth.requireAuth ??= false;
  parsed.auth.authSuccessMessage ??= '';
  parsed.auth.loginTriggerMessages ??= ['/login'];
  parsed.auth.registerTriggerMessages ??= ['/register'];
  parsed.auth.loginCommand ??= '/login {{password}}';
  parsed.auth.registerCommand ??= '/register {{password}} {{password}}';

  return parsed;
}
