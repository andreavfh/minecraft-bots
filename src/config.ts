import fs from 'fs';
import YAML from 'yaml';

const CONFIG_FILE = 'setup.yaml';
const DEFAULT_PASSWORD = 'dubai';

export interface Config {
  variables: Record<string, string>;
  onJoin: any[];
  responses: any[];
  logging?: {
    saveChatLogs?: boolean;
    logsFolder?: string;
  };
}

export function loadConfig(name: string): Config {
  let config: Config = { variables: {}, onJoin: [], responses: [] };

  if (fs.existsSync(CONFIG_FILE)) {
    const file = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = YAML.parse(file);
  }

  let password = DEFAULT_PASSWORD;
  if (fs.existsSync('registered.json')) {
    const registered = JSON.parse(fs.readFileSync('registered.json', 'utf8'));
    const found = registered.find((r: { name: string; password: string }) => r.name === name);
    if (found) password = found.password;
    else if (config.variables?.password) password = config.variables.password;
  } else if (config.variables?.password) {
    password = config.variables.password;
  }

  config.variables.password = password;

  return config;
}

export function applyVariables(str: string, vars: Record<string, string>) {
  return str.replace(/\{\{(.*?)\}\}/g, (_, v) => vars[v.trim()] ?? '');
}
