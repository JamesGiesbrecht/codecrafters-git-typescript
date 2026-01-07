import { FileModeEnum, GitObjectTypeEnum } from "../constants";
import { getFileModeFromPath, readUntilNullByte } from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import { GitFileObject, type GitObjectOptions } from "./GitObject";

export class GitBlob extends GitFileObject {
  type: GitObjectTypeEnum = GitObjectTypeEnum.Blob;

  get mode(): FileModeEnum {
    return getFileModeFromPath(this.gitDir);
  }

  constructor(options: GitObjectOptions = {}, baseDir?: string) {
    super(options, baseDir);
    const { sha, packFile } = options;
    if (sha) {
      const buffer = GitHelper.loadObjectBuffer(sha);
      const line = readUntilNullByte(buffer);
      const [type, size] = line.contents.split(" ");
      if (type != GitObjectTypeEnum.Blob) {
        throw new Error(`Invalid type ${type}`);
      }
      this.size = Number(size);
      this.content = buffer.subarray(line.offset).toString();
    }

    if (packFile) {
      // console.log(packFile.data.toString());
    }
  }

  toBuffer(): Buffer {
    const header = `${this.type} ${this.size}\0`;
    return Buffer.concat([Buffer.from(header), Buffer.from(this.content)]);
  }
}
