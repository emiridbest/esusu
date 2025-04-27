import { createTamagui } from "tamagui";

import { tokens } from "./tokens";
import { themes } from "./themes";
import { shorthands } from "./shorthands";

export const config = createTamagui({
  tokens,
  themes,
  shorthands
});