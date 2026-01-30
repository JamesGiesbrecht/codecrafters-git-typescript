import { FileModeEnum, GitObjectTypeEnum } from "../constants";
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
    const header = `${this.type} ${this.size}\0`;
    return Buffer.concat([Buffer.from(header), this.content]);
  }
}
