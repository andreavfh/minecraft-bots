# Minecraft Multi-Bot Controller with YAML Configuration

This project allows you to run multiple Minecraft bots using [mineflayer](https://github.com/PrismarineJS/mineflayer) with proxy support, dynamic bot registration, and configurable behavior via a YAML file.

---

## Features

- Launch multiple bots concurrently with individual Minecraft accounts.
- Use SOCKS4 proxies fetched dynamically from ProxyScrape.
- Configure bot behavior (chat, movement, commands, delays) using a flexible `setup.yaml`.
- Automatic registration system to save bot credentials (`registered.json`).
- Interactive console controls to send chat messages and move bots individually or globally.
- Dynamic response system: bots listen to chat messages and trigger actions based on keywords.

---

## File Overview

- `bots.mjs`: Master controller that launches bot child processes, manages proxies, registered accounts, and provides console input controls.
- `index.js`: Bot process that connects to the Minecraft server, reads YAML config, executes actions (`onJoin` and chat `responses`), and listens for commands from the master.
- `setup.yaml`: YAML configuration file where you define variables, initial actions on join (`onJoin`), and chat-triggered responses.
- `registered.json`: JSON file that stores registered bot accounts with their passwords.
- `botnames.json`: JSON array of base names to generate new bot usernames if needed.

---

## Setup and Configuration

### 1. Registering Bots

- When a bot connects for the first time, it can run actions including registration.
- Use the `register` action in `setup.yaml` to run the Minecraft `/register` command automatically with your chosen password.
- Registered accounts are saved in `registered.json` automatically to avoid re-registering.

Example registration response in `setup.yaml`:

```yaml
responses:
  - if: "/register"
    command: "register {{password}} {{password}}"
```

---

### 2. YAML Configuration Structure (`setup.yaml`)

```yaml
variables:
  password: "yourPassword"
  customVar: "value"

onJoin:
  - say: "Hello world!"
  - move: forward
    duration: 1000
  - delay: 500
  - move: left
    duration: 1000

responses:
  - if: "welcome"
    say: "I'm a {{customVar}} bot!"
  - if: "/login"
    command: "login {{password}}"
  - if: "please move"
    move: left
    duration: 600
  - if: "exit"
    quit: true
```

- `variables`: Variables to be used inside commands or chat messages with `{{variableName}}` syntax.
- `onJoin`: Actions the bot executes immediately after spawning.
- `responses`: Chat-triggered actions. If a received chat message contains the `if` string, the bot executes the corresponding actions.

Supported actions:

- `say`: Send a chat message.
- `command`: Send a command (prefixed automatically with `/` if not present).
- `move`: Move in directions (`forward`, `left`, `back`, `right`, `jump`) for a given `duration` in milliseconds.
- `delay`: Wait specified milliseconds before next action.
- `register`: Save bot credentials to `registered.json`.
- `quit`: Disconnect the bot.

---

## How to Use

1. **Install dependencies:**

```bash
npm install mineflayer proxy-agent yaml node-fetch
```

2. **Prepare configuration files:**

- Create your `setup.yaml` with desired behavior.
- Create a `botnames.json` file with an array of bot base names, e.g.:

```json
["BotAlpha", "BotBeta", "BotGamma"]
```

- Optionally, add registered bots in `registered.json` (auto-managed).

3. **Run the master bot controller:**

```bash
node bots.mjs [serverIp] [numberOfBots]
```

- `serverIp` (optional): Minecraft server address (default: `localhost`).
- `numberOfBots` (optional): Number of bots to spawn (default: 8).

4. **Control bots via keyboard:**

- `t`: Enter chat mode to send messages to bots.
- `W, A, S, D, Space`: Move bots in respective directions.
- `Tab`: Toggle between global (all bots) or individual bot control.
- Arrow keys:
  - Left/Right: Change selected bot.
  - Up: Add next registered bot.
  - Down: Disconnect selected bot.
- `Ctrl+C`: Exit the program.

---

## Notes

- Proxies are fetched dynamically from ProxyScrape (SOCKS4).
- Bots automatically register/login based on commands in `setup.yaml`.
- Movements and delays allow simulating player actions.
- Responses allow creating interactive bot behaviors triggered by chat messages.

---

## License

MIT License

---

Feel free to open issues or contribute!

---
