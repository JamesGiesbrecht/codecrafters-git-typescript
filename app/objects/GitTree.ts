import {
  FileModeEnum,
  GitObjectTypeEnum,
  PackFileObjectTypeEnum,
} from "../constants";
import {
  getFileMode,
  readUntilNullByte,
  generateSha1Hash,
} from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import path from "path";
import { GitFileObject, type GitObjectOptions } from "./GitObject";
import { GitBlob } from "./GitBlob";
import type { PackFileObject } from "../types";
import { GitSubmodule } from "./GitSubmodule";

export class GitTree extends GitFileObject {
  type: GitObjectTypeEnum = GitObjectTypeEnum.Tree;
  mode: FileModeEnum = FileModeEnum.Directory;
  entries: GitFileObject[] = [];

  constructor(options: GitObjectOptions = {}, baseDir: string) {
    super(options, baseDir);
    const { sha, filepath, packFile } = options;
    let buffer = options.buffer;
    if (sha && !buffer) {
      buffer = GitHelper.loadObjectBuffer(sha, this.baseDir);
    }
    if (buffer) {
      this.parseBuffer(buffer);
    }
    if (filepath) {
      this.generateTree(filepath);
    }
    if (packFile) {
      if (packFile.header.type !== PackFileObjectTypeEnum.TREE) {
        throw new Error("Pack file is not a tree");
      }
      this.parsePackFile(packFile);
      if (packFile.header.size !== this.size) {
        throw new Error(
          `Pack file size <${packFile.header.size}> does not match calculated commit size <${this.size}>`
        );
      }
      // Compute and preserve the hash from the original packFile data
      const originalBuffer = Buffer.concat([
        Buffer.from(`${this.type} ${packFile.header.size}\0`),
        packFile.data,
      ]);
      this.hash = generateSha1Hash(originalBuffer);
    }
  }

  private parsePackFile(packFile: PackFileObject) {
    this.parseBuffer(packFile.data, true);
    this.size = this.calculateSize();
  }

  private parseBuffer(buffer: Buffer, skipHeader?: Boolean) {
    let offset = 0;

    // Parse header if present
    if (!skipHeader) {
      const line = readUntilNullByte(buffer, offset);
      const [type, size] = line.contents.split(" ");
      if (type != GitObjectTypeEnum.Tree) {
        throw new Error(`Invalid tree object: ${buffer.toString()}`);
      }
      this.size = Number(size);
      offset = line.offset;
      this.content = buffer.subarray(offset);
    }

    // Parse entries
    while (offset < buffer.length) {
      // Read mode and filename
      const line = readUntilNullByte(buffer, offset);
      const [_mode, name] = line.contents.split(" ");
      offset = line.offset;

      // Read 20-byte SHA1 hash
      const sha = buffer.subarray(offset, offset + 20).toHex();
      offset += 20;

      const mode = getFileMode(_mode);
      const type =
        mode === FileModeEnum.Directory
          ? GitObjectTypeEnum.Tree
          : GitObjectTypeEnum.Blob;

      if (mode === FileModeEnum.Submodule) {
        const submodule = new GitSubmodule(sha, name, this.baseDir);
        this.entries.push(submodule);
      } else if (type === GitObjectTypeEnum.Tree) {
        const subTree = new GitTree({}, this.baseDir);
        subTree.hash = sha;
        subTree.filename = name;
        this.entries.push(subTree);
      } else {
        const blob = new GitBlob({}, this.baseDir);
        blob.hash = sha;
        blob.filename = name;
        this.entries.push(blob);
      }
    }
  }

  private calculateSize(): number {
    return Buffer.concat(this.entries.map((e) => e.toTreeBuffer())).length;
  }

  private generateTree(filepath: string) {
    const dirContents = GitHelper.getDirectoryContents(filepath);
    for (const entry of dirContents) {
      const filepath = path.join(entry.parentPath, entry.name);
      const gitObj = entry.isDirectory()
        ? new GitTree({ filepath }, this.baseDir)
        : new GitBlob({ filepath }, this.baseDir);
      gitObj.filename = entry.name;
      this.entries.push(gitObj);
    }
    this.size = this.calculateSize();
    // Sort entries by filename
    this.entries.sort((a, b) => a.filename.localeCompare(b.filename));
  }

  ls(nameOnly: boolean = false): string {
    if (nameOnly) {
      /**
       * <file1>
       * <file2>
       * <file3>
       */
      return (
        this.entries.map((e) => e.filename).join("\n") +
        (this.entries.length > 0 ? "\n" : "")
      );
    }
    /**
     * 100644 blob 37cef192599bc823c9575a9a04bf71ff665ac516    <file1>
     * 040000 tree fdb70afa78cb712038679107e90c846946a48747    <dir1>
     * 040000 tree f06e35fbb333349bbe7e3f65380181e482e09d40    <dir2>
     * 100644 blob d92d1f55d80143cb7ed5a685a523a63cf0ec3c93    <file2>
     */
    return (
      this.entries
        .map(
          (entry) =>
            `${entry.mode} ${entry.type} ${entry.getHash}    ${entry.filename}`
        )
        .join("\n") + (this.entries.length > 0 ? "\n" : "")
    );
  }

  write(): void {
    this.entries.forEach((entry) => entry.write());
    this.size = this.calculateSize();
    super.write();
  }

  toBuffer(): Buffer {
    // "tree <size>\0" + entries
    const entries = this.entries.map((e) => e.toTreeBuffer());
    const header = `${this.type} ${this.size}\0`;
    const buf = Buffer.concat([Buffer.from(header), ...entries]);
    return buf;
  }
}
