import fs from "fs";
import {
  DEFAULT_IDENTITY,
  FileModeEnum,
  GIT_DIRS,
  GitObjectTypeEnum,
} from "../constants";
import {
  generateSha1Hash,
  getFileModeFromPath,
  getObjectType,
  getTimezoneOffsetString,
  readUntilNullByte,
} from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import path from "path";
import type { GitIdentity } from "../types";

export type GitObjectOptions = {
  sha?: string;
  filepath?: string;
};

export abstract class GitObject {
  abstract type: GitObjectTypeEnum;
  size: number = 0;
  content: string = "";
  filename: string = "";

  constructor(
    options: GitObjectOptions = {},
    type: GitObjectTypeEnum = GitObjectTypeEnum.Blob
  ) {
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
      GIT_DIRS.OBJECTS,
      this.shaHash.substring(0, 2),
      this.shaHash.substring(2)
    );
  }

  get buffer(): Buffer {
    return this.toBuffer();
  }

  abstract write(): void;

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
