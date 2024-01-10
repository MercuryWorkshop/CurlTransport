// import { dtsPlugin } from "esbuild-plugin-d.ts";
import { build } from "esbuild";

let makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {

    // build.onResolve({ filter: /protocol/ }, args => ({ external: false }))
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

build({
  bundle: true,
  format: "esm",
  entryPoints: [`./src/main.ts`],
  outfile: `./dist/index.mjs`,
  plugins: [makeAllPackagesExternalPlugin],
  external: ["fs", "ws", "path"],
})
build({
  bundle: true,
  format: "cjs",
  entryPoints: [`./src/main.ts`],
  outfile: `./dist/index.cjs`,
  external: ["fs", "ws", "path"],
  // plugins: [dtsPlugin({
  //   outDir: `./dist/`,
  //   tsconfig: "tsconfig.json"
  // })]
})
