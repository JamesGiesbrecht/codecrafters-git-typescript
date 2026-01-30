import fs from "fs";
import path from "path";
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
  type: GitObjectTypeEnum = GitObjectTypeEnum.Blob;

  get mode(): FileModeEnum {
    return getFileModeFromPath(this.gitDir);
  }

  constructor(options: GitObjectOptions = {}, baseDir: string) {
    super(options, baseDir);
    const { sha, filepath, packFile } = options;
    let buffer = options.buffer;

    if (sha && !buffer) {
      buffer = GitHelper.loadObjectBuffer(sha, baseDir);
    }
    if (buffer) {
      this.parseBuffer(buffer);
    }
    if (filepath) {
      const fileContents = fs.readFileSync(filepath);
      this.size = fileContents.length;
      this.content = fileContents;
      this.filename = path.basename(filepath);
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
