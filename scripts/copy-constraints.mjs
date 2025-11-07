import { cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const source = path.join(projectRoot, "src", "constraints");
const destination = path.join(projectRoot, "dist", "constraints");

await cp(source, destination, { recursive: true, force: true });
