"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomSocksProxies = getRandomSocksProxies;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function getRandomSocksProxies() {
    const url = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=3000&country=all';
    const res = await (0, node_fetch_1.default)(url);
    const body = await res.text();
    return body
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => `socks4://${p}`);
}
