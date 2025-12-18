import type { FileMode, GitObjectType } from "./constants";

export type ParsedArgs = {
  positional: string[];
  [key: string]: string | boolean | string[];
};

export type GitIdentity = {
  name: string;
  email: string;
};
