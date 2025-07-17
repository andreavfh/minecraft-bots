export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

import { ChatMessage } from 'prismarine-chat';

export function getMessageWithAnsi(message: any): string {
  if (typeof message.toAnsi === 'function') {
    return message.toAnsi(); // Usa prismarine-chat si está disponible
  }

  // Fallback: manual con colores ANSI básicos (sin estilos)
  function parsePart(part: any): string {
    let text = part.text || '';
    if (part.color) {
      // ANSI básico para algunos colores de consola
      const colorCodes: Record<string, string> = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m',
        dark_red: '\x1b[31m',
        dark_green: '\x1b[32m',
        dark_blue: '\x1b[34m',
        dark_gray: '\x1b[90m',
        reset: '\x1b[0m',
      };

      const ansiColor = colorCodes[part.color] || '';
      const reset = '\x1b[0m';
      text = ansiColor + text + reset;
    }

    if (part.extra && Array.isArray(part.extra)) {
      text += part.extra.map(parsePart).join('');
    }

    return text;
  }

  return parsePart(message);
}
