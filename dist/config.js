"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const CONFIG_FILE = 'setup.yaml';
const REGISTERED_FILE = 'registered.json';
const DEFAULT_PASSWORD = 'dubai';
function loadConfig(botName) {
    var _a, _b, _c, _d, _e, _f;
    const file = fs_1.default.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = yaml_1.default.parse(file) || {};
    parsed.variables ?? (parsed.variables = {});
    parsed.responses ?? (parsed.responses = []);
    parsed.onJoin ?? (parsed.onJoin = []);
    parsed.auth ?? (parsed.auth = {});
    // Leer passwords registradas
    let registeredPassword;
    if (fs_1.default.existsSync(REGISTERED_FILE)) {
        try {
            const registered = JSON.parse(fs_1.default.readFileSync(REGISTERED_FILE, 'utf8'));
            const found = registered.find(acc => acc.name === botName);
            if (found && found.password) {
                registeredPassword = found.password;
            }
        }
        catch (e) {
            console.warn(`Error leyendo ${REGISTERED_FILE}:`, e);
        }
    }
    // Priorizar contraseña en registered.json si existe
    if (registeredPassword) {
        parsed.variables.password = registeredPassword;
    }
    else if (!parsed.variables.password) {
        parsed.variables.password = DEFAULT_PASSWORD;
    }
    (_a = parsed.auth).requireAuth ?? (_a.requireAuth = false);
    (_b = parsed.auth).authSuccessMessage ?? (_b.authSuccessMessage = '');
    (_c = parsed.auth).loginTriggerMessages ?? (_c.loginTriggerMessages = ['/login']);
    (_d = parsed.auth).registerTriggerMessages ?? (_d.registerTriggerMessages = ['/register']);
    (_e = parsed.auth).loginCommand ?? (_e.loginCommand = '/login {{password}}');
    (_f = parsed.auth).registerCommand ?? (_f.registerCommand = '/register {{password}} {{password}}');
    return parsed;
}
