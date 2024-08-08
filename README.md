## `bin2ts`

Convert binary file to inline ts using base64 encoding.

## Usage

convert file:

```shell
deno run jsr:@mutefis/bin2ts -o a.js a.png
```

import:

```typescript
import raw from "./a.js";
console.log(raw); // Uint8Array
```

## Node-API

```shell
deno run jsr:@mutefis/bin2ts -o a.js a.node
```

exported object:

```typescript
import mod from "./a.js";
console.log(mod); // object
```
