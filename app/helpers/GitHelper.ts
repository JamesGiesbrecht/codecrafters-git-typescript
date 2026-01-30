import fs from "fs";
import path from "path";
import zlib from "node:zlib";
import { GIT_DIRS, GIT_FILES, GitObjectTypeEnum } from "../constants";
import { GitBlob, GitCommit, GitTree, type GitObject } from "../objects";
import { getObjectType } from "./utils";

export default class GitHelper {
  public static loadObjectBuffer(sha: string, baseDir: string): Buffer {
    const file = path.join(
      baseDir,
      GIT_DIRS.OBJECTS,
      sha.substring(0, 2),
      sha.substring(2)
    );
    if (!fs.existsSync(file)) {
      throw new Error(`File not found at ${file}: ${sha}`);
    }
    const fileContents = fs.readFileSync(file);
    return this.decompressBuffer(fileContents);
  }

  public static loadFromBuffer(buffer: Buffer, baseDir: string): GitObject {
    const objectType = getObjectType(buffer);
    switch (objectType) {
      case GitObjectTypeEnum.Blob:
        return new GitBlob({ buffer }, baseDir);
      case GitObjectTypeEnum.Tree:
        return new GitTree({ buffer }, baseDir);
      case GitObjectTypeEnum.Commit:
        return new GitCommit({ buffer }, baseDir);
    }
  }

  public static loadFromSha(shaHash: string, baseDir: string): GitObject {
    const buffer = this.loadObjectBuffer(shaHash, baseDir);
    return this.loadFromBuffer(buffer, baseDir);
  }

  public static getDirectoryContents(dir: string): fs.Dirent<string>[] {
    const contents = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((file) => file.name != GIT_DIRS.GIT && file.name != ".git");
    // GIT_DIRS.GIT may not point to .git when run locally
    return contents;
  }

  public static initGitDirs(HEAD: string, baseDir: string) {
    fs.mkdirSync(path.resolve(baseDir, GIT_DIRS.GIT), { recursive: true });
    fs.mkdirSync(path.resolve(baseDir, GIT_DIRS.OBJECTS), { recursive: true });
    fs.mkdirSync(path.resolve(baseDir, GIT_DIRS.REFS), { recursive: true });
    fs.writeFileSync(path.resolve(baseDir, GIT_FILES.HEAD), `ref: ${HEAD}\n`);
  }

  private static compressBuffer(buff: Buffer): Buffer {
    return zlib.deflateSync(buff);
  }

  private static decompressBuffer(buff: Buffer): Buffer {
    return zlib.inflateSync(buff);
  }
}
