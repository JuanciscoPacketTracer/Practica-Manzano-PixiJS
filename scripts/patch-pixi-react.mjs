import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reactPackageRoot = join(projectRoot, "node_modules", "@pixi", "react", "dist");
const bundles = ["index.cjs-dev.js", "index.cjs.js", "index.es-dev.js", "index.es.js"];
const deprecatedAccess = "this.app.renderer.plugins.interaction";
const currentAccess = "this.app.renderer.events";

if (!existsSync(reactPackageRoot)) process.exit(0);

for (const bundle of bundles) {
    const bundlePath = join(reactPackageRoot, bundle);
    const source = readFileSync(bundlePath, "utf8");
    if (source.includes(deprecatedAccess)) {
        writeFileSync(bundlePath, source.replaceAll(deprecatedAccess, currentAccess));
    }
}
