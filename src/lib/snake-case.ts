/**
 * Converts a string to snake_case.
 * Handles spaces, hyphens, and CamelCase.
 */
export const toSnakeCase = (str: string): string => {
  return (
    str
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
      )
      ?.map((word) => word.toLowerCase())
      .join("_") || ""
  );
};

// Usage
const input: string = "Trade Republic";
const output = toSnakeCase(input); // "trade_republic"
