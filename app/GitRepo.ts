import * as fs from "fs";
import { DEFAULT_PARSED_ARGS, GIT_DIRS, GIT_FILES } from "./constants";
import type { ParsedArgs } from "./types";
import { GitBlob, GitCommit, GitTree } from "./objects";
import GitHelper from "./helpers/GitHelper";
import path from "path";
import { clone } from "./helpers/GitClone";

export default class GitRepo {
  public static async init() {
    fs.mkdirSync(GIT_DIRS.GIT, { recursive: true });
    fs.mkdirSync(GIT_DIRS.OBJECTS, { recursive: true });
    fs.mkdirSync(GIT_DIRS.REFS, { recursive: true });
    fs.writeFileSync(GIT_FILES.HEAD, "ref: refs/heads/main\n");
    console.log("Initialized git directory");
  }

  public static catFile(sha: string): string {
    const blob = new GitBlob({ sha });
    return blob.content;
  }

  public static hashObject(filepath: string): string {
    const blob = new GitBlob({ filepath });
    blob.write();
    return blob.shaHash;
  }

  public static lsTree(
    sha: string,
    flags: ParsedArgs = DEFAULT_PARSED_ARGS
  ): string {
    const tree = new GitTree({ sha });
    const nameOnly = flags["name-only"] === true;
    return tree.ls(nameOnly);
  }

  public static writeTree(dirPath: string = "."): string {
    const tree = new GitTree({ filepath: dirPath });
    tree.write();
    return tree.shaHash;
  }

  public static commitTree(
    treeSha: string,
    parentSha: string,
    message: string
  ): string {
    const commit = new GitCommit(treeSha, parentSha, message);
    commit.write();
    return commit.shaHash;
  }

  public static async clone(url: string, dest: string): Promise<void> {
    if (!url) {
      url = process.env.GIT_CLONE_URL as string;
    }
    if (!dest) {
      dest = path.basename(url, ".git");
    }
    console.log(`Cloning "${url}" to "${dest}"`);
    await clone(url, dest);
  }
}
