import fetch from 'node-fetch';

export async function getRandomSocksProxies(): Promise<string[]> {
  const url = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=3000&country=all';
  const res = await fetch(url);
  const body = await res.text();

  return body
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `socks4://${p}`);
}
