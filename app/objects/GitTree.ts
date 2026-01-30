import {
  CONSTANTS,
  FileModeEnum,
  GitObjectTypeEnum,
  PackFileObjectTypeEnum,
} from "../constants";
import { getFileMode, readUntilNullByte } from "../helpers/utils";
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
      this.validatePackFileType(packFile, PackFileObjectTypeEnum.TREE);
      this.parsePackFile(packFile);
      if (packFile.header.size !== this.size) {
        throw new Error(
          `Pack file size <${packFile.header.size}> does not match calculated commit size <${this.size}>`,
        );
      }
    }
  }

  private parsePackFile(packFile: PackFileObject) {
    this.parseBuffer(packFile.data, true);
    this.size = packFile.header.size;
  }

  private parseBuffer(buffer: Buffer, skipHeader?: Boolean) {
    let offset = 0;

    // Parse header if present
    if (!skipHeader) {
      const {
        type,
        size,
        offset: headerOffset,
      } = GitHelper.parseAndValidateObjectHeader(
        buffer,
        GitObjectTypeEnum.Tree,
        offset,
      );
      this.size = Number(size);
      offset = headerOffset;
      this.content = buffer.subarray(offset);
    }

    // Parse entries
    while (offset < buffer.length) {
      // Read mode and filename
      const line = readUntilNullByte(buffer, offset);
      const [_mode, name] = line.contents.split(" ");
      offset = line.offset;

      // Read 20-byte SHA1 hash
      const sha = buffer
        .subarray(offset, offset + CONSTANTS.SHA1_HASH_LENGTH)
        .toHex();
      offset += CONSTANTS.SHA1_HASH_LENGTH;

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
        blob.mode = mode;
        this.entries.push(blob);
      }
    }
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
            `${entry.mode} ${entry.type} ${entry.getHash}    ${entry.filename}`,
        )
        .join("\n") + (this.entries.length > 0 ? "\n" : "")
    );
  }

  write(): void {
    // Write entries that are real objects (created from filepath or loaded from disk)
    // Skip entries that are just parsed references from tree data (they have size 0 and no content)
    this.entries.forEach((entry) => {
      if (entry.size > 0) {
        entry.write();
      }
    });
    super.write();
  }

  toBuffer(): Buffer {
    // "tree <size>\0" + entries
    const entriesBuffer = Buffer.concat(
      this.entries.map((e) => e.toTreeBuffer()),
    );
    this.size = entriesBuffer.length;
    return Buffer.concat([this.header, entriesBuffer]);
  }
}
