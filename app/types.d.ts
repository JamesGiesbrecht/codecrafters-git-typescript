import type { FileMode, GitObjectType } from "./constants";

export type ParsedArgs = {
  [key: string]: string | boolean | string[];
};

export interface GitTree {
  size: number;
  entries: GitTreeEntry[];
}

export interface GitTreeEntry {
  mode: FileMode;
  type: GitObjectType;
  name: string;
  hash: string;
}

export interface GitObject {
  type: GitObjectType;
  size: number;
  content: string;
  hash?: string;
}
