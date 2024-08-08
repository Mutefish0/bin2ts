import { encodeBase64 } from "jsr:@std/encoding@1";
import { parseArgs } from "jsr:@std/cli@1/parse-args";

type Loader = "raw" | "napi";
interface Options {
  output?: string;
  loader?: Loader;
}

function bin2ts(filename: string, opts: Options) {
  const buf = Deno.readFileSync(filename);
  const b64 = encodeBase64(buf);
  const { output, loader = "raw" } = opts;
  let suffix = "";
  let prefix = "";

  if (loader === "raw") {
    suffix = "export default raw;";
  } else if (loader === "napi") {
    if (!filename.endsWith(".node")) {
      throw new Error("Not NAPI module!");
    }
    prefix = `import { createRequire } from "node:module";`;
    suffix = `
const require = createRequire(import.meta.url);
const tempFilePath = Deno.makeTempFileSync({
  suffix: ".node",
});
Deno.writeFileSync(tempFilePath, raw);
const mod = require(tempFilePath);
Deno.removeSync(tempFilePath);
export default mod;
    `;
  }

  const code = `
${prefix}
import { decodeBase64 } from "jsr:@std/encoding@1";
const raw = decodeBase64("${b64}");
${suffix}
      `;

  let outputName = (output ?? filename).replace(/(\.[^.]+)$/, "");
  if (!output) {
    outputName += ".base64";
  }

  Deno.writeTextFileSync(`${outputName}.ts`, code);
}

if (import.meta.main) {
  const flags = parseArgs(Deno.args, {
    string: ["o", "l"],
  });
  const filename = flags._[0] as string;
  const output = flags.o;
  const loader = flags.l as Loader;
  if (filename) {
    bin2ts(filename, { output, loader });
  }
}
