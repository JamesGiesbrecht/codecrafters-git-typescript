import { DEFAULT_PARSED_ARGS, DEFAULT_REF } from "./constants";
import type { ParsedArgs } from "./types";
import { GitBlob, GitCommit, GitTree } from "./objects";
import GitHelper from "./helpers/GitHelper";
import path from "path";
import { clone } from "./helpers/GitClone";

export default class GitRepo {
  public static async init() {
    GitHelper.initGitDirs(DEFAULT_REF, ".");
    console.log("Initialized git directory");
  }

  public static catFile(sha: string): string {
    const blob = new GitBlob({ sha }, ".");
    return blob.toString();
  }

  public static hashObject(filepath: string): string {
    const blob = new GitBlob({ filepath }, ".");
    blob.write();
    return blob.getHash;
  }

  public static lsTree(
    sha: string,
    flags: ParsedArgs = DEFAULT_PARSED_ARGS
  ): string {
    const tree = new GitTree({ sha }, ".");
    const nameOnly = flags["name-only"] === true;
    return tree.ls(nameOnly);
  }

  public static writeTree(dirPath: string = "."): string {
    const tree = new GitTree({ filepath: dirPath }, ".");
    tree.write();
    return tree.getHash;
  }

  public static commitTree(
    treeSha: string,
    parentSha: string,
    message: string
  ): string {
    const commit = new GitCommit({ treeSha, parentSha, message }, ".");
    commit.write();
    return commit.getHash;
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
