import path from "path";
import type { GitIdentity, ParsedArgs } from "../types";

export enum GitObjectTypeEnum {
  Commit = "commit",
  Tree = "tree",
  Blob = "blob",
}

export enum FileModeEnum {
  File = "100644",
  Executable = "100755",
  SymbolicLink = "120000",
  Directory = "040000",
  Submodule = "160000",
  Unknown = 0,
}

export enum PackFileObjectTypeEnum {
  RESERVED_0,
  COMMIT,
  TREE,
  BLOB,
  TAG,
  RESERVED_5,
  OFS_DELTA,
  REF_DELTA,
}

const { NODE_ENV } = process.env;
let GIT_DIR = ".fakegit";
if (NODE_ENV === "cc" || NODE_ENV === "test") {
  GIT_DIR = ".git";
}

export const GIT_DIRS = {
  GIT: GIT_DIR,
  OBJECTS: path.join(GIT_DIR, "objects"),
  REFS: path.join(GIT_DIR, "refs"),
  HEAD: path.join(GIT_DIR, "HEAD"),
};

export const GIT_FILES = {
  HEAD: path.join(GIT_DIR, "HEAD"),
};

export const COMMANDS = {
  INIT: "init",
  CAT_FILE: "cat-file",
  HASH_OBJECT: "hash-object",
  LS_TREE: "ls-tree",
  WRITE_TREE: "write-tree",
  COMMIT_TREE: "commit-tree",
  CLONE: "clone",
};

export const DEFAULT_IDENTITY: GitIdentity = {
  name: "Linus Torvalds",
  email: "ltorvalds@localhost",
  date: new Date(),
  tz: "-0600",
};

export const DEFAULT_PARSED_ARGS: ParsedArgs = {
  positional: [],
};

export const DEFAULT_REF = "refs/heads/main";

export const CONSTANTS = {
  FLUSH_PKT: "0000",
  HEAD: "HEAD",
  NULL_BYTE: "\0",
};
