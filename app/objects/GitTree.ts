import { FileModeEnum, GitObjectTypeEnum } from "../constants";
import { getObjectType, readUntilNullByte } from "../helpers/utils";
import GitHelper from "../helpers/GitHelper";
import path from "path";
import { GitFileObject, type GitObjectOptions } from "./GitObject";
import { GitBlob } from "./GitBlob";

export class GitTree extends GitFileObject {
  type: GitObjectTypeEnum = GitObjectTypeEnum.Tree;
  mode: FileModeEnum = FileModeEnum.Directory;
  entries: GitFileObject[] = [];

  constructor(options: GitObjectOptions = {}) {
    super(options, GitObjectTypeEnum.Tree);
    if (options.sha) {
      const buffer = GitHelper.loadObjectBuffer(options.sha);
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
        if (type != GitObjectTypeEnum.Tree) {
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
      const sha = buffer.subarray(offset, offset + 20).toHex();
      offset += 20;

      const type = getObjectType(GitHelper.loadObjectBuffer(sha));
      if (type == GitObjectTypeEnum.Tree) {
        const subTree = new GitTree({ sha });
        subTree.filename = name;
        this.entries.push(subTree);
      } else {
        const blob = new GitBlob({ sha });
        blob.filename = name;
        this.entries.push(blob);
      }
    }
  }

  private generateTree(filepath: string) {
    const dirContents = GitHelper.getDirectoryContents(filepath);
    for (const entry of dirContents) {
      const filepath = path.join(entry.parentPath, entry.name);
      const gitObj = entry.isDirectory()
        ? new GitTree({ filepath })
        : new GitBlob({ filepath });
      gitObj.filename = entry.name;
      this.entries.push(gitObj);
    }
    this.size = Buffer.concat(this.entries.map((e) => e.toTreeBuffer())).length;
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
            `${entry.mode} ${entry.type} ${entry.shaHash}    ${entry.filename}`
        )
        .join("\n") + (this.entries.length > 0 ? "\n" : "")
    );
  }

  write(): void {
    this.entries.forEach((entry) => entry.write());
    GitHelper.writeGitObject(this);
  }

  toBuffer(): Buffer {
    // "tree <size>\0" + entries
    const entries = this.entries.map((e) => e.toTreeBuffer());
    const contentBuffer = Buffer.concat(entries);
    const header = `${this.type} ${this.size}\0`;
    return Buffer.concat([Buffer.from(header), contentBuffer]);
  }
}
