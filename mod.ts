import { encodeBase64 } from "jsr:@std/encoding@1";
import { parseArgs } from "jsr:@std/cli@1/parse-args";

const flags = parseArgs(Deno.args, {
  string: ["o"],
});

const filename = flags._[0] as string;

if (filename) {
  const buf = Deno.readFileSync(filename);
  const b64 = encodeBase64(buf);
  const code = `
      import { decodeBase64 } from "jsr:@std/encoding@1";
      export default decodeBase64("${b64}");
    `;
  let outputName = (flags.o ?? filename).replace(/(\.[^.]+)$/, "");
  if (!flags.o) {
    outputName += ".base64";
  }
  Deno.writeTextFileSync(`${outputName}.ts`, code);
}
