import * as fs from "fs";
import { GIT_DIRS, GIT_FILES } from "./constants";
import type { ParsedArgs } from "./types";
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
    blob.write();
    return blob.hash;
  }

  public static lsTree(hash: string, flags: ParsedArgs = {}): string {
    const tree = new GitTree({ hash });
    const nameOnly = flags["name-only"] === true;
    return tree.ls(nameOnly);
  }

  public static writeTree(dirPath: string = "."): string {
    const tree = new GitTree({ filepath: dirPath });
    tree.write();
    return tree.hash;
  }
}
