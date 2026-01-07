import fs from "fs";
import path from "path";
import zlib from "node:zlib";
import { FileModeEnum, GIT_DIRS, GitObjectTypeEnum } from "../constants";
import { generateSha1Hash } from "../helpers/utils";
import type { PackFileObject } from "../types";

export type GitObjectOptions = {
  sha?: string;
  filepath?: string;
  packFile?: PackFileObject;
};

export abstract class GitObject {
  abstract type: GitObjectTypeEnum;
  baseDir: string;
  size: number = 0;
  content: string = "";
  filename: string = "";

  constructor(
    options: GitObjectOptions = {},
    baseDir: string = ".",
    type: GitObjectTypeEnum = GitObjectTypeEnum.Blob
  ) {
    this.baseDir = baseDir;
    if (options.filepath && type === GitObjectTypeEnum.Blob) {
      const fileContents = fs.readFileSync(options.filepath).toString();
      this.size = fileContents.length;
      this.content = fileContents;
      this.filename = path.basename(options.filepath);
    }
  }

  get shaHash(): string {
    return generateSha1Hash(this.toBuffer());
  }

  get gitDir(): string {
    return path.join(
      this.baseDir,
      GIT_DIRS.OBJECTS,
      this.shaHash.substring(0, 2),
      this.shaHash.substring(2)
    );
  }

  get dirname(): string {
    return path.dirname(this.gitDir);
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
    return this.toBuffer().toString();
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
    const modeStr = `${Number(this.mode)} ${this.filename}\0`;
    const shaBuffer = Buffer.from(this.shaHash, "hex");
    return Buffer.concat([Buffer.from(modeStr), shaBuffer]);
  }
}
