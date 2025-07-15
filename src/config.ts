import fs from 'fs';
import YAML from 'yaml';

const CONFIG_FILE = 'setup.yaml';

export interface Config {
  variables: Record<string, string>;
  onJoin: any[];
  responses: any[];
}

export function loadConfig(defaultPassword: string): Config {
  let config: Config = { variables: {}, onJoin: [], responses: [] };

  if (fs.existsSync(CONFIG_FILE)) {
    const file = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = YAML.parse(file);
  }

  if (!config.variables.password) config.variables.password = defaultPassword;
  return config;
}

export function applyVariables(str: string, vars: Record<string, string>) {
  return str.replace(/\{\{(.*?)\}\}/g, (_, v) => vars[v.trim()] ?? '');
}
