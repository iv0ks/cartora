// Runtime configuration, read once from the environment.
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  databaseUrl: required('DATABASE_URL', 'postgres://cartora:cartora@localhost:5432/cartora'),
  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-secret-change-me'),

  // The challenge flag, baked into the image at build time and seeded into the
  // victim's order. Never committed.
  flag: required('FLAG', 'FLAG{CARTORA_NOT_YOUR_CART}'),
};
