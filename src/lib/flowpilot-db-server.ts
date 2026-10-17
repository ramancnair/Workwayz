import * as wayfinderDb from './wayfinder-db-server';
export * from './wayfinder-db-server';

// Create flowpilot* aliases for every wayfinder* export
const aliases: Record<string, any> = {};
for (const [key, value] of Object.entries(wayfinderDb)) {
  if (key.startsWith('wayfinder')) {
    const flowpilotKey = 'flowpilot' + key.slice(9);
    aliases[flowpilotKey] = value;
  }
}

export const flowpilotCreateUser = wayfinderDb.wayfinderCreateUser;
