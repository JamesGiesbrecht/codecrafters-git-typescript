import { CONSTANTS, FileModeEnum, GitObjectTypeEnum } from "../constants";
import { GitFileObject, type GitObjectOptions } from "./GitObject";

// Placeholder for GitSubmodule
export class GitSubmodule extends GitFileObject {
  type: GitObjectTypeEnum = GitObjectTypeEnum.Tree;
  mode: FileModeEnum = FileModeEnum.Submodule;

  constructor(sha: string, filename: string, baseDir: string) {
    super({}, baseDir);
    this.hash = sha;
    this.filename = filename;
  }

  write(): void {
    // no-op
  }

  toBuffer(): Buffer {
    return Buffer.concat([this.header, this.content]);
  }
}
