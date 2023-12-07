import { readFileSync, writeFileSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { createRequire } from "node:module";
import path from "path";
import { fileURLToPath } from "url";

import { globalExternals } from "@fal-works/esbuild-plugin-global-externals";
import esbuild, { BuildOptions, OnLoadArgs, PluginBuild } from "esbuild";
import inlineWorkerPlugin from "esbuild-plugin-inline-worker";
import sassPlugin from "esbuild-plugin-sass";
import { ESLint } from "eslint";
// import JavaScriptObfuscator from "javascript-obfuscator";
import sha256 from "sha256";
import { minify } from "terser";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const isProduction = process.argv.includes("-mode=production");
const isPreBuild = process.argv.includes("-mode=prebuild");

const date = new Date().toDateString();
const banner = `/**
 * ${pkg.name} v${pkg.version} build ${date}
 * ${pkg.homepage}
 * Copyright ${date.slice(-4)} ${pkg.author}
 * @license ${pkg.license}
 */`;

const devDistFilePath = "demo/public/dist/pano-viewer.esm.js";
const preBuildDistFilePath = "demo/public/dist/pano-viewer.esm.js";
const productDistFilePath = "dist/pano-viewer.esm.min.js";

let config: BuildOptions = {
    entryPoints: ["./src/index.ts"],
    bundle: true,
    banner: { js: banner },
    logLevel: "info",
    platform: "browser",
    format: "esm",
    globalName: "xviewer",
    color: true,
    watch: !isProduction,
    sourcemap: !isProduction,
    minify: isProduction,
    minifyWhitespace: isProduction,
    minifyIdentifiers: isProduction,
    minifySyntax: isProduction,
    legalComments: "none",
    treeShaking: isProduction,
    define: {
        DEBUG_MODE: isProduction ? "false" : "true",
        __VERSION__: JSON.stringify(pkg.version),
    },
    target: isProduction ? ["es2015"] : "esnext",
    loader: {
        ".png": "dataurl",
        ".glsl": "text",
        ".proto": "text",
        ".ts": "ts",
        ".js": "js",
        ".css": "css",
    },
    alias: {
        "@": "src",
        "src/*": "src/*",
    },
    // external: ["pdfjs-dist"],
    plugins: [
        globalExternals({
            pdfjsLib: "pdfjs-dist",
        }),
        sassPlugin(),
        inlineWorkerPlugin(),
        inlineCSSPlugin(),
    ],
};

if (isProduction || isPreBuild) {
    const distFile = isPreBuild ? preBuildDistFilePath : productDistFilePath;
    if (isPreBuild) {
        config = Object.assign(config, {
            watch: false,
            sourcemap: false,
        });
    }
    await esbuild
        .build({
            ...config,
            outfile: distFile,
            // If need obfuscation code should set false
            // minify: false,
            // minifyWhitespace: false,
            // minifyIdentifiers: false,
            // minifySyntax: false,
        })
        .catch(() => process.exit(1));
    let code = readFileSync(distFile, "utf8");

    // obfuscation code
    // https://www.obfuscator.io/
    // const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
    //     optionsPreset: "default",
    //     log: true,
    //     target: "browser",
    //     seed: 0,
    //     stringArrayRotate: false,
    //     stringArrayShuffle: false,
    //     identifierNamesGenerator: "mangled",
    //     // transformObjectKeys: true,
    //     // renameGlobals: true,
    //     // renameProperties: true,
    // });
    // code = obfuscationResult.getObfuscatedCode();

    // minify code
    // https://terser.org/docs/api-reference#minify-options
    const minifyCode = await minify(code, {
        compress: true,
        mangle: true,
        format: {
            comments: "some",
        },
    });
    if (minifyCode.code) {
        code = minifyCode.code;
    }
    writeFileSync(distFile, code, "utf-8");

    console.info(`After minify: ${formatBytes(statSync(distFile).size)}`);
} else {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const publicPath = path.join(__dirname, "/demo/public");
    config.plugins?.push(
        eslintPlugin({
            filter: /\.(jsx?|tsx?)$/,
        })
    );
    esbuild
        .build({
            ...Object.assign(config, {
                outfile: devDistFilePath,
                incremental: true,
            }),
        })
        .then(() => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const liveServer = require("live-server");

            const params = {
                port: 9000, // Set the server port. Defaults to 8080.
                root: publicPath, // Set root directory that's being served. Defaults to cwd.
                open: false, // When false, it won't load your browser by default.
                // host: "0.0.0.0", // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
                // ignore: "scss,my/templates", // comma-separated string for paths to ignore
                // file: "index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
                // wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
                // mount: [["/components", "./node_modules"]], // Mount a directory to a route.
                // logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
                // middleware: [
                //     function (req, res, next) {
                //         next();
                //     },
                // ], // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
            };
            liveServer.start(params);
        });
}

// just for inline css to bundle js
function inlineCSSPlugin() {
    return {
        name: "esbuild-plugin-inline-css",
        setup(build: PluginBuild) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            build.onLoad({ filter: /\.(css)$/ }, async (args: any) => {
                const sourcePath = path.resolve(args.resolveDir, args.path);
                const sourceJS = await generateInjectCSS(sourcePath);
                return {
                    contents: sourceJS,
                    loader: "js",
                };
            });
        },
    };
}

async function generateInjectCSS(sourcePath: string) {
    const styleID = sha256(sourcePath);
    const sourceCSS = readFileSync(sourcePath);

    const {
        outputFiles: [out],
    } = await esbuild.build({
        stdin: {
            contents: sourceCSS,
            resolveDir: sourcePath,
            loader: "css",
        },
        minify: true,
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
        bundle: true,
        write: false,
        format: "esm",
        loader: {
            ".png": "dataurl",
            ".eot": "dataurl",
            ".woff": "dataurl",
            ".ttf": "dataurl",
            ".svg": "dataurl",
            ".otf": "dataurl",
        },
    });

    return `(function(){
        var inBrowser = typeof document !== "undefined";
        if (inBrowser && !document.getElementById('${styleID}')) {
            var e = document.createElement('style');
            e.id = '${styleID}';
            e.textContent = \`${out.text}\`;
            document.head.appendChild(e);
        }
    })();`;
}

function eslintPlugin({ filter = /\.(jsx?|tsx?|vue|svelte)$/, persistLintIssues = true, ...eslintOptions }) {
    return {
        name: "eslint",
        async setup(build: PluginBuild) {
            const linter = new ESLint(eslintOptions);
            const formatter = await linter.loadFormatter("stylish");
            const cache = new Map();
            if (["info", "debug", "verbose"].includes(build.initialOptions.logLevel || "info")) {
                console.log("Building initial ESLint cache...");
            }
            build.onLoad({ filter }, async ({ path }: OnLoadArgs) => {
                const isNodeModule = /node_modules/.test(path);
                const isCameraControls = /camera-controls/.test(path);
                const input = isNodeModule ? 0 : await readFile(path, "utf8");
                let value = cache.get(path);

                if (!value || value.input !== input) {
                    const contents = isNodeModule || isCameraControls ? [] : await linter.lintFiles(path);
                    if (eslintOptions.fix) {
                        ESLint.outputFixes(contents);
                    }
                    const hasLintIssues = contents[0]?.messages?.length;
                    value = { input, output: { contents } };

                    if (!hasLintIssues || !persistLintIssues) {
                        cache.set(path, value);
                    }
                    if (hasLintIssues) {
                        return { warnings: [{ text: formatter.format(contents) as string }] };
                    }
                }
                return null;
            });
        },
    };
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) {
        return "0 Bytes";
    }
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
