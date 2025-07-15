# Minecraft Bots System (TypeScript Version)

This project allows you to spawn and control multiple Minecraft bots using `mineflayer`, managed via a terminal interface with support for proxies, actions on join, dynamic variables, response automation, and optional chat log saving.

## 🛠 Requirements

- Node.js 18+
- TypeScript (`npm i -D typescript`)
- `mineflayer`, `proxy-agent`, `yaml`, and other dependencies (see below)

## 📦 Installation

1. Clone or download the repository.
2. Run the following to install dependencies:

```bash
npm install
```

3. Compile TypeScript files:

```bash
npx tsc
```

> The compiled files will be located in the `dist/` folder.

## 🚀 Running Bots

To start the bots:

```bash
node dist/botManager.js <server-ip> <number-of-bots>
```

- `server-ip`: Minecraft server address (default: `localhost`)
- `number-of-bots`: Number of bots to start (default: 8)

Example:

```bash
node dist/botManager.js play.example.com 12
```

## ⚙️ Configuration (`setup.yaml`)

This YAML file defines actions, responses, variables, and logging preferences.

### Example:

```yaml
variables:
  password: dubai
  greeting: "Hello, world!"

onJoin:
  - say: "{{greeting}}"
  - delay: 1000
  - move: forward
    duration: 600
  - register: true

responses:
  - if: "hello"
    say: "Hi there!"

logging:
  saveChatLogs: true
  logsFolder: "./logs"
```

### Fields:

- `variables`: You can reference these inside `say`, `command`, etc.
- `onJoin`: Actions to execute when the bot joins the server.
- `responses`: Actions to execute when certain messages are detected in chat.
- `logging.saveChatLogs`: If true, saves all incoming messages to a log file.
- `logging.logsFolder`: Directory to store chat logs (default: `./logs`).

## 📁 Files Used

- `setup.yaml`: Configuration file for variables and behaviors.
- `registered.json`: Stores bot accounts that have already registered. Format:

```json
[
  { "name": "BotOne", "password": "mypassword" },
  { "name": "BotTwo", "password": "secure123" }
]
```

- `botnames.json`: List of potential bot base names for generating random accounts.

```json
["AlphaBot", "BetaBot", "GammaBot"]
```

## 🔑 Password Logic

When a bot is created:
- If its name exists in `registered.json`, that password is used.
- Otherwise, it uses `variables.password` from `setup.yaml`.
- If neither exists, it defaults to `dubai`.

## 🧠 Controls

Once the bots are running, you can control them via your keyboard:

- `W`, `A`, `S`, `D`, `Space`: Moves bot(s) for 300 ms.
- `T`: Enter chat mode. Type and press `Enter` to send.
- `←` / `→`: Switch between individual bots.
- `↑`: Add a new bot from the `registered.json` pool.
- `↓`: Disconnect the currently selected bot.
- `Tab`: Toggle between global (all bots) and individual mode.
- `Ctrl + C`: Exit the application.

## 📝 Logs

If enabled, each bot logs chat messages to:

```
logs/<BotName>-YYYY-MM-DD.log
```

Each line is timestamped in ISO format.

## 🧪 Dev Tips

To recompile TypeScript after making code changes:

```bash
npx tsc
```

To run with live reload (optional, using tsx):

```bash
npx tsx botManager.ts
```

## 📂 Project Structure

```
.
├── botnames.json
├── registered.json
├── setup.yaml
├── src/
│   ├── botManager.ts
│   ├── botProcess.ts
│   ├── config.ts
│   └── utils.ts
├── dist/
│   └── compiled JS files
├── logs/
└── README.md
```

## 📦 Dependencies

```bash
npm install mineflayer proxy-agent yaml node-fetch
npm install -D typescript @types/node
```

## ✅ Features

- Multi-bot controller with terminal UI
- Proxy support (SOCKS4 via proxyscrape)
- Automatic bot registration and login
- Dynamic variable injection with `{{variable}}`
- Automatic response to chat triggers
- Chat log saving with timestamps
- Extendable architecture in clean TypeScript

---

## License

MIT License

---

Feel free to open issues or contribute!

---
