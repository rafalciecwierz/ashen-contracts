type StoredPlayer = { id: string; email: string; passwordHash: string };

// In-memory stand-in for the two Prisma calls AuthService makes. Lookups are
// exact and case-sensitive, like the unique index on Player.email, so these
// tests catch an email that reaches the service unnormalized.
export function createFakePrisma() {
  const players = new Map<string, StoredPlayer>();
  return {
    player: {
      findUnique: ({ where }: { where: { email: string } }) =>
        Promise.resolve(players.get(where.email) ?? null),
      create: ({ data }: { data: Omit<StoredPlayer, 'id'> }) => {
        const player = { id: `player-${players.size + 1}`, ...data };
        players.set(player.email, player);
        return Promise.resolve(player);
      },
    },
  };
}
