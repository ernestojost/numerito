import "server-only";
import { cache } from "react";

/** One clock reading per request, so every server component of a render agrees on "now". */
export const requestTime = cache(() => Date.now());
