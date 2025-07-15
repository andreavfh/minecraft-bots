export interface BotStatus {
  name: string;
  health: number;
  food: number;
  position: { x: string; y: string; z: string };
  world: string;
  heldItem: string;
  inventory: string[];
  xp: number;
  uptime: number;
}

export interface CommandMessage {
  type: 'chat' | 'keydown' | 'keyup';
  key?: string;
  message?: string;
}
