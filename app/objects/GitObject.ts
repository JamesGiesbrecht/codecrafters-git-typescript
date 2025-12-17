import fs from "fs";
import { FileMode, GIT_DIRS, GitObjectType } from "../constants";
import {
  generateSha1Hash,
  getFileModeFromPath,
  getObjectType,
  readUntilNullByte,
} from "../helpers/utils";
import FileHelper from "../helpers/FileHelper";
import path from "path";

type GitObjectOptions = {
  hash?: string;
  filepath?: string;
};

export abstract class GitObject {
  abstract type: GitObjectType;
  size: number = 0;
  content: string = "";
  abstract mode: FileMode;
  filename: string = "";

  constructor(
    options: GitObjectOptions = {},
    type: GitObjectType = GitObjectType.Blob
  ) {
    if (options.filepath && type != GitObjectType.Tree) {
      const fileContents = fs.readFileSync(options.filepath).toString();
      this.size = fileContents.length;
      this.content = fileContents;
      this.filename = path.basename(options.filepath);
    }
  }

  get hash(): string {
    return generateSha1Hash(this.toBuffer());
  }

  get gitDir(): string {
    return path.join(
      GIT_DIRS.OBJECTS,
      this.hash.substring(0, 2),
      this.hash.substring(2)
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

  toTreeString(): string {
    return this.toTreeBuffer().toString();
  }

  toTreeBuffer(): Buffer {
    // mode filename\0 + 20-byte binary hash
    // Note: for directories, git uses "40000" not "040000"
    const modeStr = `${Number(this.mode)} ${this.filename}\0`;
    const hashBuffer = Buffer.from(this.hash, "hex");
    return Buffer.concat([Buffer.from(modeStr), hashBuffer]);
  }
}

export class GitBlob extends GitObject {
  type: GitObjectType = GitObjectType.Blob;

  get mode(): FileMode {
    return getFileModeFromPath(this.gitDir);
  }

  constructor(options: GitObjectOptions = {}) {
    super(options);

    if (options.hash) {
      const buffer = FileHelper.loadObjectBuffer(options.hash);
      const line = readUntilNullByte(buffer);
      const [type, size] = line.contents.split(" ");
      if (type != GitObjectType.Blob) {
        throw new Error(`Invalid type ${type}`);
      }
      this.size = Number(size);
      this.content = buffer.subarray(line.offset).toString();
    }
  }

  write(): void {
    FileHelper.writeGitObject(this);
  }

  toBuffer(): Buffer {
    const header = `${this.type} ${this.size}\0`;
    return Buffer.concat([Buffer.from(header), Buffer.from(this.content)]);
  }
}

export class GitTree extends GitObject {
  type: GitObjectType = GitObjectType.Tree;
  mode: FileMode = FileMode.Directory;
  entries: GitObject[] = [];

  constructor(options: GitObjectOptions = {}) {
    super(options, GitObjectType.Tree);
    if (options.hash) {
      const buffer = FileHelper.loadObjectBuffer(options.hash);
      this.parseBuffer(buffer);
    }
    if (options.filepath) {
      this.generateTree(options.filepath);
    }
  }

  private parseBuffer(buffer: Buffer) {
    let offset = 0;
    let isTree: Boolean | undefined = undefined;

    while (offset < buffer.length) {
      if (isTree === undefined) {
        // Verify buffer is a tree object
        const line = readUntilNullByte(buffer, offset);
        const [type, size] = line.contents.split(" ");
        if (type != GitObjectType.Tree) {
          throw new Error(`Invalid tree object: ${buffer.toString()}`);
        }
        isTree = true;
        this.size = Number(size);
        offset = line.offset;
        this.content = buffer.subarray(offset).toString();
      }

      // Read mode and filename
      const line = readUntilNullByte(buffer, offset);
      const [_mode, name] = line.contents.split(" ");
      offset = line.offset;

      // Read 20-byte SHA1 hash
      const hash = buffer.subarray(offset, offset + 20).toHex();
      offset += 20;

      const type = getObjectType(FileHelper.loadObjectBuffer(hash));
      if (type == GitObjectType.Tree) {
        const subTree = new GitTree({ hash });
        subTree.filename = name;
        this.entries.push(subTree);
      } else {
        const blob = new GitBlob({ hash });
        blob.filename = name;
        this.entries.push(blob);
      }
    }
  }

  private generateTree(filepath: string) {
    const dirContents = FileHelper.getDirectoryContents(filepath);
    for (const entry of dirContents) {
      const filepath = path.join(entry.parentPath, entry.name);
      const gitObj = entry.isDirectory()
        ? new GitTree({ filepath })
        : new GitBlob({ filepath });
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
            `${entry.mode} ${entry.type} ${entry.hash}    ${entry.filename}`
        )
        .join("\n") + (this.entries.length > 0 ? "\n" : "")
    );
  }

  write(): void {
    this.entries.forEach((entry) => entry.write());
    FileHelper.writeGitObject(this);
  }

  toBuffer(): Buffer {
    // "tree <size>\0" + entries
    const entries = this.entries.map((e) => e.toTreeBuffer());
    const contentBuffer = Buffer.concat(entries);
    const header = `${this.type} ${contentBuffer.length}\0`;
    return Buffer.concat([Buffer.from(header), contentBuffer]);
  }
}
