import { existsSync } from "fs";
import { argv } from "process";
import { makePluginBuildContext, hasFlag } from "./common.mjs";

const plugin = [...argv].pop();

if (!existsSync(`./plugins/${plugin}`)) {
    console.error(`Usage:   pnpm build [--watch] [--release] <PLUGIN_NAME>`);
    process.exit(1);
}

const production = hasFlag(argv, "r", "release");
const shouldWatch = hasFlag(argv, "w", "watch");

const ctx = await makePluginBuildContext(plugin, production, true, true);

console.clear();

if (shouldWatch) {
    await ctx.watch();
    console.log(`Watching over plugin "${plugin}" changes...`);
} else {
    await ctx.rebuild();
    await ctx.dispose();
}
