import { it } from "./it";

export function playersLabel(count: number) {
  return count === 1 ? it.playerOne : it.playerMany.replace("{count}", String(count));
}
