import fs from "fs";
import path from "path";
import zlib from "node:zlib";
import { GIT_DIRS } from "../constants";
import type { GitObject } from "../objects/GitObject";

export default class FileHelper {
  public static loadObjectBuffer(hash: string): Buffer {
    const file = path.join(
      GIT_DIRS.OBJECTS,
      hash.substring(0, 2),
      hash.substring(2)
    );
    const fileContents = fs.readFileSync(file);
    return this.decompressBuffer(fileContents);
  }

  public static writeGitObject(obj: GitObject): void {
    const dirname = path.dirname(obj.gitDir);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    const compressed = this.compressBuffer(obj.buffer);
    fs.writeFileSync(obj.gitDir, compressed);
  }

  public static getDirectoryContents(dir: string): fs.Dirent<string>[] {
    const contents = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((file) => file.name != GIT_DIRS.GIT && file.name != ".git");
    // GIT_DIRS.GIT may not point to .git when run locally
    return contents;
  }

  private static compressBuffer(buff: Buffer): Buffer {
    return zlib.deflateSync(buff);
  }

  private static decompressBuffer(buff: Buffer): Buffer {
    return zlib.inflateSync(buff);
  }
}
