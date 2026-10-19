export type JsonTransformMode = "minify" | "format";

export interface JsonToolsSettings {
  /** Spaces for pretty-print (2 or 4). */
  indent: 2 | 4;
  /** Trailing newline after formatted/minified output. */
  trailingNewline: boolean;
  /** Sort object keys when transforming. */
  sortKeys: boolean;
}

export type RuntimeMessage =
  | {
      type: "TRANSFORM_AND_PASTE";
      mode: JsonTransformMode;
      /** Optional: clipboard text already read in the popup (has user gesture). */
      clipboardText?: string;
    }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: JsonToolsSettings }
  | { type: "GET_LAST_RESULT" };
