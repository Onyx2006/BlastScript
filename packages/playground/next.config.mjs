import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  // Static export: the playground runs 100% client-side, so GitHub Pages
  // can serve it as plain HTML/JS/CSS (output goes to packages/playground/out).
  output: "export",
  // GitHub Pages project sites live under /<repo-name>. The CI workflow sets
  // NEXT_PUBLIC_BASE_PATH; locally it stays empty so `npm run dev` is unchanged.
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@blastscript/core"],
  reactStrictMode: true,
  webpack: (config) => {
    // Belt-and-braces: resolve @blastscript/core straight to its source
    // file on disk, bypassing node_modules entirely. This sidesteps any
    // npm-workspace symlink/junction quirks (seen on Windows) where the
    // package might not get linked into node_modules correctly.
    config.resolve.alias["@blastscript/core"] = path.resolve(
      __dirname,
      "../core/src/index.ts"
    );

    // core's tsconfig uses NodeNext-style imports (e.g. "./lexer.js"
    // pointing at "lexer.ts"). webpack doesn't know that convention by
    // default, so tell it .js can also resolve to .ts/.tsx here.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      ".js": [".ts", ".tsx", ".js"],
    };

    return config;
  },
};

export default nextConfig;