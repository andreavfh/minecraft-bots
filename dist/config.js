"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.applyVariables = applyVariables;
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const CONFIG_FILE = 'setup.yaml';
const DEFAULT_PASSWORD = 'dubai';
function loadConfig(name) {
    let config = { variables: {}, onJoin: [], responses: [] };
    if (fs_1.default.existsSync(CONFIG_FILE)) {
        const file = fs_1.default.readFileSync(CONFIG_FILE, 'utf8');
        config = yaml_1.default.parse(file);
    }
    let password = DEFAULT_PASSWORD;
    if (fs_1.default.existsSync('registered.json')) {
        const registered = JSON.parse(fs_1.default.readFileSync('registered.json', 'utf8'));
        const found = registered.find((r) => r.name === name);
        if (found)
            password = found.password;
        else if (config.variables?.password)
            password = config.variables.password;
    }
    else if (config.variables?.password) {
        password = config.variables.password;
    }
    config.variables.password = password;
    return config;
}
function applyVariables(str, vars) {
    return str.replace(/\{\{(.*?)\}\}/g, (_, v) => vars[v.trim()] ?? '');
}
