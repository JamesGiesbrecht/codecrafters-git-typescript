import fs from "fs";
import path from "path";
import {
  CONSTANTS,
  FileModeEnum,
  GitObjectTypeEnum,
  PackFileObjectTypeEnum,
} from "../constants";
import { readUntilNullByte } from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import { GitFileObject, type GitObjectOptions } from "./GitObject";

export class GitBlob extends GitFileObject {
  type: GitObjectTypeEnum = GitObjectTypeEnum.Blob;
  mode: FileModeEnum = FileModeEnum.File;

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
      this.size = packFile.header.size;
      this.content = packFile.data;
    }
  }

  private parseBuffer(buffer: Buffer) {
    const line = readUntilNullByte(buffer);
    const [type, size] = line.contents.split(" ");
    if (type != GitObjectTypeEnum.Blob) {
      throw new Error(`Invalid type ${type}`);
    }
    this.size = Number(size);
    // Extract EXACTLY the number of bytes specified in the header, not all remaining bytes
    const contentStart = line.offset;
    const contentEnd = contentStart + this.size;
    this.content = buffer.subarray(contentStart, contentEnd);
  }

  toBuffer(): Buffer {
    const header = `${this.type} ${this.size}${CONSTANTS.NULL_BYTE}`;
    return Buffer.concat([Buffer.from(header), this.content]);
  }
}
