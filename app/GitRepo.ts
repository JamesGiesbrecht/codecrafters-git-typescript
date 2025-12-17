import * as fs from "fs";
import path from "path";
import { GIT_DIRS, GIT_FILES, GitObjectType } from "./constants";
import FileHelper from "./helpers/FileHelper";
import type { ParsedArgs } from "./types";
import { parseTree } from "./helpers/utils";
import { GitBlob, GitTree } from "./objects/GitObject";

export default class GitRepo {
  public static async init() {
    fs.mkdirSync(GIT_DIRS.GIT, { recursive: true });
    fs.mkdirSync(GIT_DIRS.OBJECTS, { recursive: true });
    fs.mkdirSync(GIT_DIRS.REFS, { recursive: true });
    fs.writeFileSync(GIT_FILES.HEAD, "ref: refs/heads/main\n");
    console.log("Initialized git directory");
  }

  public static catFile(hash: string): string {
    const blob = new GitBlob({ hash });
    return blob.content;
  }

  public static hashObject(filepath: string): string {
    const blob = new GitBlob({ filepath });
    FileHelper.writeGitObject(blob);
    return blob.hash;
  }

  public static lsTree(hash: string, flags: ParsedArgs = {}): string {
    const tree = new GitTree({ hash });
    const nameOnly = flags["name-only"] === true;
    return tree.ls(nameOnly);
  }

}
