import { CHARACTER_LIMIT } from "../constants.js";

/**
 * Halves `items` until the JSON-serialized `output` fits CHARACTER_LIMIT,
 * marking the response as truncated so the agent knows to narrow its query.
 */
export function withCharacterLimit<T extends { items: unknown[]; truncated?: boolean }>(
  output: T,
): T {
  let result = output;
  while (
    JSON.stringify(result).length > CHARACTER_LIMIT &&
    result.items.length > 1
  ) {
    result = {
      ...result,
      items: result.items.slice(0, Math.ceil(result.items.length / 2)),
      truncated: true,
    };
  }
  return result;
}
