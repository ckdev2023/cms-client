import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

if (!process.env.DB_URL) {
  process.env.DB_URL = "postgres://cms:cms@localhost:5432/cms";
}

/**
 * 执行命令并继承标准输出，确保门禁失败时能看到原始错误。
 *
 * @param {string} command 可执行文件名
 * @param {string[]} args 命令参数
 * @returns {void}
 */
function run(command, args) {
  execFileSync(command, args, {
    cwd: packageRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      DB_URL: process.env.DB_URL,
    },
  });
}

/**
 * 导入模块，确保 Drizzle 配置与 schema 都能被运行时正常解析。
 *
 * @param {string} relativePath 相对 package 根目录的模块路径
 * @returns {Promise<void>}
 */
async function ensureImportable(relativePath) {
  const moduleUrl = pathToFileURL(path.join(packageRoot, relativePath)).href;
  await import(moduleUrl);
}

await ensureImportable("drizzle.config.ts");
await ensureImportable("src/infra/db/drizzle/schema.ts");
run("npx", ["drizzle-kit", "check", "--config", "drizzle.config.ts"]);
