import Fastify from "fastify";
import { registerOrderRoutes } from "./features/orders/http.controller";
import { getConfig } from "./config";

export async function buildServer() {
  const app = Fastify();
  await registerOrderRoutes(app);
  return app;
}

export async function start() {
  const server = await buildServer();
  const config = getConfig();
  await server.listen({ port: 3333, host: "0.0.0.0" });
  console.log(`API listening with db ${config.databaseUrl}`);
}
