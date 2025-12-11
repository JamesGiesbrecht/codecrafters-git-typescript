import path from "path";

export enum GitObjectType {
  Commit = "commit",
  Tree = "tree",
  Blob = "blob",
}
const GIT_DIR = ".git";

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
};
