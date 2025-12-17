import type { FileMode, GitObjectType } from "./constants";

export type ParsedArgs = {
  [key: string]: string | boolean | string[];
};

export interface GitTreeOld {
  size: number;
  entries: GitTreeEntryOld[];
}

export interface GitTreeEntryOld {
  mode: FileMode;
  type: GitObjectType;
  name: string;
  hash: string;
}
