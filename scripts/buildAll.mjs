import { readdir } from "fs/promises";
import { argv } from "process";
import { makePluginBuildContext, buildRepo, hasFlag } from "./common.mjs";

const production = hasFlag(argv, "r", "release");

for (const name of await readdir("./plugins")) {
    const ctx = await makePluginBuildContext(name, production, false);

    await ctx.rebuild();
    await ctx.dispose();
}

await buildRepo();