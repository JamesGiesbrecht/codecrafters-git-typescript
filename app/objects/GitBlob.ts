import {
  FileModeEnum,
  GitObjectTypeEnum,
  PackFileObjectTypeEnum,
} from "../constants";
import { getFileModeFromPath, readUntilNullByte } from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import { GitFileObject, type GitObjectOptions } from "./GitObject";
import type { PackFileObject } from "../types";

export class GitBlob extends GitFileObject {
  hash?: string;
  type: GitObjectTypeEnum = GitObjectTypeEnum.Blob;

  get mode(): FileModeEnum {
    return getFileModeFromPath(this.gitDir);
  }

  constructor(options: GitObjectOptions = {}, baseDir?: string) {
    super(options, baseDir);
    const { sha, packFile } = options;
    if (sha) {
      const buffer = GitHelper.loadObjectBuffer(sha, baseDir);
      this.parseBuffer(buffer);
    }

    if (packFile) {
      if (packFile.header.type !== PackFileObjectTypeEnum.BLOB) {
        throw new Error("Pack file is not a blob");
      }
      this.parsePackFile(packFile);
      if (packFile.header.size !== this.size) {
        throw new Error(
          `Pack file size <${packFile.header.size}> does not match calculated commit size <${this.size}>`
        );
      }
    }
  }

  get shaHash(): string {
    return this.hash || super.shaHash;
  }

  private parsePackFile(packFile: PackFileObject) {
    this.size = packFile.data.length;
    this.content = packFile.data;
  }

  private parseBuffer(buffer: Buffer) {
    const line = readUntilNullByte(buffer);
    const [type, size] = line.contents.split(" ");
    if (type != GitObjectTypeEnum.Blob) {
      throw new Error(`Invalid type ${type}`);
    }
    this.size = Number(size);
    this.content = buffer.subarray(line.offset);
  }

  toBuffer(): Buffer {
    const header = `${this.type} ${this.size}\0`;
    return Buffer.concat([Buffer.from(header), this.content]);
  }
}
