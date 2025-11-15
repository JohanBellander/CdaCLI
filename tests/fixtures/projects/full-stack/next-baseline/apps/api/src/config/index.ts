type AppConfig = {
  databaseUrl: string;
};

const cached: AppConfig = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://local/dev",
};

export function getConfig(): AppConfig {
  return cached;
}
