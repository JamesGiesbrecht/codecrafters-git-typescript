import { DEFAULT_IDENTITY, GitObjectTypeEnum } from "../constants";
import { getTimezoneOffsetString } from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import type { GitIdentity } from "../types";
import { GitObject } from "./GitObject";

export class GitCommit extends GitObject {
  type: GitObjectTypeEnum = GitObjectTypeEnum.Commit;
  treeSha: string;
  parentSha: string;
  author: GitIdentity = DEFAULT_IDENTITY;
  committer: GitIdentity = DEFAULT_IDENTITY;
  timestamp: Date = new Date();
  message: string;

  constructor(treeSha: string, parentSha: string, message: string) {
    super();
    this.treeSha = treeSha;
    this.parentSha = parentSha;
    this.message = message;
  }

  private get formattedTimestamp() {
    return `${Math.floor(
      this.timestamp.getTime() / 1000
    )} ${getTimezoneOffsetString(this.timestamp)}`;
  }

  write(): void {
    GitHelper.writeGitObject(this);
  }

  toBuffer(): Buffer {
    /**
     * commit <size>\0tree <tree_sha>
     * parent <parent_sha>
     * author <name> <<email>> <timestamp> <timezone>
     * committer <name> <<email>> <timestamp> <timezone>
     *
     * <commit message>
     */
    const tree = `tree ${this.treeSha}`;
    const parent = `parent ${this.parentSha}`;
    const author = `author ${this.author.name} <${this.author.email}> ${this.formattedTimestamp}`;
    const committer = `committer ${this.author.name} <${this.author.email}> ${this.formattedTimestamp}`;
    const commitBody = Buffer.from(
      [tree, parent, author, committer, "", `${this.message}\n`].join("\n")
    );

    this.size = commitBody.length;
    const header = Buffer.from(`${this.type} ${this.size}\0`);

    return Buffer.concat([header, commitBody]);
  }
}
