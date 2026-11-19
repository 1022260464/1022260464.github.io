import { createRequire } from "node:module";

const requireFromAstro = createRequire(import.meta.resolve("astro"));
const picomatch = requireFromAstro("picomatch");

export default picomatch;
