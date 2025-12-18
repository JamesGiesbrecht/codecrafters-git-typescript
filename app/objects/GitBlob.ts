import { FileMode, GitObjectType } from "../constants";
import { getFileModeFromPath, readUntilNullByte } from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import { GitFileObject, type GitObjectOptions } from "./GitObject";

export class GitBlob extends GitFileObject {
  type: GitObjectType = GitObjectType.Blob;

  get mode(): FileMode {
    return getFileModeFromPath(this.gitDir);
  }

  constructor(options: GitObjectOptions = {}) {
    super(options);

    if (options.sha) {
      const buffer = GitHelper.loadObjectBuffer(options.sha);
      const line = readUntilNullByte(buffer);
      const [type, size] = line.contents.split(" ");
      if (type != GitObjectType.Blob) {
        throw new Error(`Invalid type ${type}`);
      }
      this.size = Number(size);
      this.content = buffer.subarray(line.offset).toString();
    }
  }

  write(): void {
    GitHelper.writeGitObject(this);
  }

  toBuffer(): Buffer {
    const header = `${this.type} ${this.size}\0`;
    return Buffer.concat([Buffer.from(header), Buffer.from(this.content)]);
  }
}
