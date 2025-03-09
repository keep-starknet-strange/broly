import typescript from "rollup-plugin-typescript2";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import alias from "@rollup/plugin-alias";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.esm.js",
      format: "esm",
    },
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      exports: "named",
    },
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "BitcoinOnStarknet",
      globals: {
        "cross-fetch": "fetch",
      },
    },
  ],
  external: ["cross-fetch"],
  plugins: [
    alias({
      entries: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
    }),
    resolve({
      browser: true,
      extensions: [".js", ".ts"],
    }),
    commonjs(),
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          declarationDir: "./dist/types",
        },
      },
      useTsconfigDeclarationDir: true,
    }),
  ],
};
