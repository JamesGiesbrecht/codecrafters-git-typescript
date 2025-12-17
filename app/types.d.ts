import type { FileMode, GitObjectType } from "./constants";

export type ParsedArgs = {
  [key: string]: string | boolean | string[];
};
