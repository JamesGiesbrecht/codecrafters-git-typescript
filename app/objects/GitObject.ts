import fs from "fs";
import path from "path";
import zlib from "node:zlib";
import { FileModeEnum, GIT_DIRS, GitObjectTypeEnum } from "../constants";
import { generateSha1Hash } from "../helpers/utils";
import type { PackFileObject } from "../types";

export type GitObjectOptions = {
  sha?: string;
  buffer?: Buffer;
  filepath?: string;
  packFile?: PackFileObject;
};
// "tree 312\u0000100644 .eslintrc.json\u0000�Cv\u0005\u0010�p�|j�P\u0003���mur�100644 .gitignore\u0000q=P\u0006ڿ�y,n�۴���,D�\u0004100644 .prettierrc\u0000�l���\\E\u0005�:א�G��m��100644 README.md\u0000F�\t\u001a\\8k�~�M���ړ���J100644 package-lock.json\u0000;4WHsCҤy=f�y?!���S\u001a100644 package.json\u0000��vtÍB��$�5<�3��\"3�40000 src\u0000t�\u0004��\u0014�HJ\u0018�E��P^�,��100644 tsconfig.json\u0000j_*�\u0016&/ŞN�Jc\r*�z\u0011�"
// getTargetObject, loadFromBuffer
// "tree 312\u0000100644 .eslintrc.json\u0000�Cv\u0005\u0010�p�|j�P\u0003���mur�100644 .gitignore\u0000q=P\u0006ڿ�y,n�۴���,D�\u0004100644 .prettierrc\u0000�l���\\E\u0005�:א�G��m��100644 README.md\u0000F�\t\u001a\\8k�~�M���ړ���J100644 package-lock.json\u0000;4WHsCҤy=f�y?!���S\u001a100644 package.json\u0000��vtÍB��$�5<�3��\"3�4>@M��\u0005݀�#\u0002�\"[�6�r��E��P^�,��100644 tsconfig.json\u0000j_*�\u0016&/ŞN"
export abstract class GitObject {
  abstract type: GitObjectTypeEnum;
  hash: string = "";
  baseDir: string;
  size: number = 0;
  content: Buffer = Buffer.from("");
  filename: string = "";

  constructor(options: GitObjectOptions = {}, baseDir: string) {
    this.baseDir = baseDir;
  }

  get generateHash(): string {
    return generateSha1Hash(this.toBuffer());
  }

  get getHash(): string {
    return this.hash || this.generateHash;
  }

  get gitDir(): string {
    return path.join(
      this.baseDir,
      GIT_DIRS.OBJECTS,
      this.getHash.substring(0, 2),
      this.getHash.substring(2)
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
    return this.content.toString();
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
    const shaBuffer = Buffer.from(this.getHash, "hex");
    const buf = Buffer.concat([Buffer.from(modeStr), shaBuffer]);
    return buf;
  }
}
