import fs from "fs";
import path from "path";
import zlib from "node:zlib";
import {
  CONSTANTS,
  FileModeEnum,
  GIT_DIRS,
  GitObjectTypeEnum,
  PackFileObjectTypeEnum,
} from "../constants";
import { generateSha1Hash } from "../helpers/utils";
import type { PackFileObject } from "../types";

export type GitObjectOptions = {
  sha?: string;
  buffer?: Buffer;
  filepath?: string;
  packFile?: PackFileObject;
};

export abstract class GitObject {
  abstract type: GitObjectTypeEnum;
  hash: string = "";
  baseDir: string;
  size: number = 0;
  content: Buffer = Buffer.from("");
  filename: string = "";

  constructor(_options: GitObjectOptions = {}, baseDir: string) {
    this.baseDir = baseDir;
  }

  get generateHash(): string {
    this.hash = generateSha1Hash(this.buffer);
    return this.hash;
  }

  get getHash(): string {
    return this.hash || this.generateHash;
  }

  get gitDir(): string {
    return path.join(
      this.baseDir,
      GIT_DIRS.OBJECTS,
      this.getHash.substring(0, 2),
      this.getHash.substring(2),
    );
  }

  get dirname(): string {
    return path.dirname(this.gitDir);
  }

  get header(): Buffer {
    return Buffer.from(`${this.type} ${this.size}${CONSTANTS.NULL_BYTE}`);
  }

  get buffer(): Buffer {
    return this.toBuffer();
  }

  write(): void {
    if (!fs.existsSync(this.dirname)) {
      fs.mkdirSync(this.dirname, { recursive: true });
    }
    const compressed = zlib.deflateSync(this.buffer);
    fs.writeFileSync(this.gitDir, compressed);
  }

  abstract toBuffer(): Buffer;

  toString(): string {
    return this.content.toString();
  }
  protected validatePackFileType(
    packFile: PackFileObject,
    expected: PackFileObjectTypeEnum,
  ): void {
    if (packFile.header.type !== expected) {
      throw new Error(`Pack file is not a ${expected}`);
    }
  }
}

export abstract class GitFileObject extends GitObject {
  abstract mode: FileModeEnum;

  toTreeString(): string {
    return this.toTreeBuffer().toString();
  }

  toTreeBuffer(): Buffer {
    // mode filename\0 + 20-byte binary hash
    // Note: for directories, git uses "40000" not "040000"
    const modeStr = `${Number(this.mode)} ${this.filename}${CONSTANTS.NULL_BYTE}`;
    const shaBuffer = Buffer.from(this.getHash, "hex");
    const buf = Buffer.concat([Buffer.from(modeStr), shaBuffer]);
    return buf;
  }
}
