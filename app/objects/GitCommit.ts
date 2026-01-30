import {
  CONSTANTS,
  DEFAULT_IDENTITY,
  GitObjectTypeEnum,
  PackFileObjectTypeEnum,
} from "../constants";
import GitHelper from "../helpers/GitHelper";
import type { GitIdentity } from "../types";
import { GitObject, type GitObjectOptions } from "./GitObject";

type GitCommitParams = GitObjectOptions & {
  treeSha?: string;
  parentSha?: string;
  message?: string;
};

export class GitCommit extends GitObject {
  type: GitObjectTypeEnum = GitObjectTypeEnum.Commit;
  treeSha: string = "";
  parentSha: string = "";
  author: GitIdentity = DEFAULT_IDENTITY;
  committer: GitIdentity = DEFAULT_IDENTITY;
  message: string = "";

  constructor(options: GitCommitParams, baseDir: string) {
    super({}, baseDir);
    const { sha, treeSha, parentSha, message, packFile } = options;
    if (treeSha && parentSha && message) {
      this.treeSha = treeSha;
      this.parentSha = parentSha;
      this.message = message;
    }
    let commitBodyStr = "";
    let buffer = options.buffer;
    if (packFile) {
      this.validatePackFileType(packFile, PackFileObjectTypeEnum.COMMIT);
      commitBodyStr = packFile.data.toString();
    } else if (sha && !buffer) {
      buffer = GitHelper.loadObjectBuffer(sha, baseDir);
    }
    if (buffer) {
      commitBodyStr = buffer.toString();
    }
    if (commitBodyStr) {
      this.parseCommitBodyString(commitBodyStr);
    }
    this.size = this.commitBodyBuffer.length;
  }

  private parseCommitBodyString(str: string): void {
    let body = str;
    let lines: string[] = [];
    if (str.includes(CONSTANTS.NULL_BYTE)) {
      // Discard header
      body = str.split(CONSTANTS.NULL_BYTE)[1];
    }
    lines = body.split("\n").filter((l) => l);
    this.treeSha = this.findMatchingLine("tree", lines);
    this.parentSha = this.findMatchingLine("parent", lines);
    this.author = this.parseIdString(
      this.findMatchingLine("author", lines, false),
    );
    this.committer = this.parseIdString(
      this.findMatchingLine("committer", lines, false),
    );
    this.message = lines[lines.length - 1];
  }

  get commitBodyBuffer(): Buffer {
    /**
     * commit <size>\0tree <tree_sha>
     * parent <parent_sha>
     * author <name> <<email>> <timestamp> <timezone>
     * committer <name> <<email>> <timestamp> <timezone>
     *
     * <commit message>
     */
    const lines: string[] = [];
    if (this.treeSha) lines.push(`tree ${this.treeSha}`);
    if (this.parentSha) lines.push(`parent ${this.parentSha}`);
    lines.push(this.buildIdString(this.author, "author"));
    lines.push(this.buildIdString(this.committer, "committer"));
    lines.push("");
    lines.push(`${this.message}\n`);

    return Buffer.from(lines.join("\n"));
  }

  toBuffer(): Buffer {
    return Buffer.concat([this.header, this.commitBodyBuffer]);
  }

  private findMatchingLine(
    prefix: "tree" | "parent" | "author" | "committer",
    lines: string[],
    removePrefix: boolean = true,
  ): string {
    const line = lines.find((l) => l.startsWith(`${prefix} `));
    if (removePrefix && line) {
      return line.split(" ").slice(1).join(" ");
    }
    return line || "";
  }

  private parseIdString(idStr: string): GitIdentity {
    const regex =
      /(^author|^committer)\s+(.+?)\s+<([^>]+)>\s+(\d+)\s+([+-]\d{4})$/;
    const match = idStr.match(regex);

    if (!match) throw new Error("Invalid author string");

    const [_match, _type, name, email, timestamp, tz] = match;
    const date = new Date(Number(timestamp) * 1000);
    return { name, email, date, tz };
  }

  private buildIdString(id: GitIdentity, type: "author" | "committer"): string {
    return `${type} ${id.name} <${id.email}> ${id.date.getTime() / 1000} ${
      id.tz
    }`;
  }
}
