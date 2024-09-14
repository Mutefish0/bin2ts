import { encodeBase64 } from "jsr:@std/encoding@1";
import { parseArgs } from "jsr:@std/cli@1/parse-args";

type Loader = "raw" | "napi";
interface Options {
  output?: string;
  loader?: Loader;
  chunks?: number;
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

  let outputName = (output ?? filename).replace(/(\.[^.]+)$/, "");
  if (!output) {
    outputName += ".base64";
  }

  if (opts.chunks && opts.chunks > 1) {
    const chunkSize = Math.ceil(buf.byteLength / opts.chunks);
    let entryCode = `
    ${prefix}
    import { decodeBase64 } from "jsr:@std/encoding@1";
    `;

    for (let i = 0; i < opts.chunks; i++) {
      const dataStr = b64.slice(i * chunkSize, (i + 1) * chunkSize);
      const code = `
      export default "${dataStr}";
          `;
      const oname = outputName + `.chunk_${i}`;
      Deno.writeTextFileSync(`${oname}.ts`, code);
      entryCode += `
      import chunk${i} from "./${oname}.ts";
      `;
    }

    entryCode += `
    const chunks = [];
    `;

    for (let i = 0; i < opts.chunks; i++) {
      entryCode += `
      chunks.push(chunk${i});
      `;
    }

    entryCode += `
    const raw = decodeBase64(chunks.join(""));
    ${suffix}
    `;

    Deno.writeTextFileSync(`${outputName}.ts`, entryCode);
  } else {
    const code = `
    ${prefix}
    import { decodeBase64 } from "jsr:@std/encoding@1";
    const raw = decodeBase64("${b64}");
    ${suffix}
          `;
    Deno.writeTextFileSync(`${outputName}.ts`, code);
  }
}

if (import.meta.main) {
  const flags = parseArgs(Deno.args, {
    string: ["o", "l", "c"],
  });
  const filename = flags._[0] as string;
  const output = flags.o;
  const loader = flags.l as Loader;
  const chunks = flags.c ? parseInt(flags.c) : undefined;
  if (filename) {
    bin2ts(filename, { output, loader, chunks });
  }
}
