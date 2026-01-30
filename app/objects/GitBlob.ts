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
      this.validatePackFileType(packFile, PackFileObjectTypeEnum.BLOB);
      this.size = packFile.header.size;
      this.content = packFile.data;
    }
  }

  private parseBuffer(buffer: Buffer) {
    const { type, size, offset } = GitHelper.parseAndValidateObjectHeader(
      buffer,
      GitObjectTypeEnum.Blob,
    );
    if (type != GitObjectTypeEnum.Blob) {
      throw new Error(`Invalid type ${type}`);
    }
    this.size = Number(size);
    // Extract EXACTLY the number of bytes specified in the header, not all remaining bytes
    const contentStart = offset;
    const contentEnd = contentStart + this.size;
    this.content = buffer.subarray(contentStart, contentEnd);
  }

  toBuffer(): Buffer {
    return Buffer.concat([this.header, this.content]);
  }
}
