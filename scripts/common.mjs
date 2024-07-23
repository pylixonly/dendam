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
        build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
            const result = await swc.transformFile(args.path, {
                jsc: {
                    externalHelpers: true,
                },
                // https://github.com/facebook/hermes/blob/3815fec63d1a6667ca3195160d6e12fee6a0d8d5/doc/Features.md
                // https://github.com/facebook/hermes/issues/696#issuecomment-1396235791
                env: {
                    targets: "fully supports es6",
                    include: [
                        // Pretend that arrow functions are unsupported, since hermes does not support async arrow functions for some reason
                        "transform-arrow-functions",
                        "transform-block-scoping",
                        "transform-classes"
                    ],
                    exclude: [
                        "transform-parameters",
                        "transform-template-literals",
                        "transform-async-to-generator",
                        "transform-exponentiation-operator",
                        "transform-named-capturing-groups-regex",
                        "transform-nullish-coalescing-operator",
                        "transform-object-rest-spread",
                        "transform-optional-chaining"
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
                "@bunny.*": (moduleName) => {
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

    for (const id of await readdir("./dist/plugins")) {
        if (!(await lstat(`./dist/plugins/${id}`)).isDirectory()) continue;

        const manifest = JSON.parse(await readFile(`./dist/plugins/${id}/manifest.json`));

        if (!prod) manifest.version += "-dev";

        repo[id] = {
            version: manifest.version,
            alwaysFetch: !prod
        };
    };

    await writeFile("./dist/repo.json", JSON.stringify(repo));
}