import swc from "@swc/core";
import esbuild from "esbuild";
import pluginGlobals from "esbuild-plugin-globals";
import { lstat, mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
});

/** @type import("esbuild").Plugin */
const swcPlugin = {
    name: "swc",
    setup(build) {
        build.onLoad({ filter: /\.[jt]sx?$/ }, async args => {
            const result = await swc.transformFile(args.path, {
                jsc: {
                    externalHelpers: true,
                },
                env: {
                    targets: "defaults",
                    include: [
                        "transform-classes",
                        "transform-arrow-functions",
                        "transform-block-scoping",
                        "transform-class-properties"
                    ],
                    exclude: [
                        "transform-parameters"
                    ]
                },
            });

            return { contents: result.code };
        });
    }
}

/** @type function(string): import("esbuild").Plugin */
const buildLog = (name) => ({
    name: "buildLog",
    setup: async build => {
        let lastErrored = false;
        build.onEnd(result => {
            if (lastErrored) console.clear();
            const hasError = lastErrored = result.errors.length > 0;
            const timestamp = `[${timeFormatter.format(Date.now())}]`;

            // error = red, no error = green
            if (hasError) {
                console.log("\x1b[31m", timestamp,
                    `Failed to build plugin "${name}" with ${result.errors?.length} errors!`, "\x1b[0m")
            } else {
                console.log("\x1b[32m", timestamp,
                    `Successfully built plugin "${name}"!`, "\x1b[0m");
            }
        });
    }
});

/** @type function(boolean): import("esbuild").Plugin */
const repoBuilder = (prod) => ({
    name: "repoBuilder",
    setup: async build => build.onEnd(() => buildRepo(prod))
})

export const hasFlag = (argv, s, l) => argv.slice(2).some(c => c === `-${s}` || c === `--${l}`);

export async function makePluginBuildContext(name, prod, log, repo = false) {
    const manifest = JSON.parse(await readFile(`./plugins/${name}/manifest.json`));
    const entryPoint = path.resolve(`./plugins/${name}`, manifest.main);

    delete manifest.main;

    await mkdir(`./dist/plugins/${name}`, { recursive: true });
    await writeFile(`./dist/plugins/${name}/manifest.json`, JSON.stringify(manifest));

    return await esbuild.context({
        entryPoints: [entryPoint],
        bundle: true,
        minify: prod,
        format: "iife",
        target: "esnext",
        supported: {
            // Hermes does not actually supports const and let, even though it syntactically
            // accepts it, but it's treated just like 'var' and causes issues
            "const-and-let": false
        },
        globalName: "plugin",
        outfile: `dist/plugins/${name}/index.js`,
        keepNames: true,
        legalComments: "none",
        plugins: [
            swcPlugin,
            pluginGlobals({
                "react": "React",
                "react-native": "ReactNative",
                "@pyoncord.*": (moduleName) => {
                    return moduleName.slice(1).replace(/\//g, ".");
                },
            }),
            log && buildLog(name),
            repo && repoBuilder(prod)
        ].filter(Boolean)
    });
}

export async function buildRepo(prod = true) {
    const repo = {};

    for (const name of await readdir("./dist/plugins")) {
        if (!(await lstat(`./dist/plugins/${name}`)).isDirectory()) continue;

        const manifest = JSON.parse(await readFile(`./dist/plugins/${name}/manifest.json`));

        if (!prod) manifest.version += "-dev";

        repo[name] = {
            name: manifest.name,
            version: manifest.version,
            alwaysFetch: !prod
        };
    };

    await writeFile("./dist/repo.json", JSON.stringify(repo));
}