import fs from "fs";
import path from "path";
import zlib from "node:zlib";
import { GIT_DIRS } from "../constants";

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

  public static writeGitObject(hash: string, contents: string): void {
    const subDir = hash.substring(0, 2);
    const file = hash.substring(2);
    const dir = path.join(GIT_DIRS.OBJECTS, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const compressed = this.compressBuffer(Buffer.from(contents));
    fs.writeFileSync(path.join(dir, file), compressed);
  }

  public static getFileContents(filePath: string): string {
    const fileContents = fs.readFileSync(filePath);
    return fileContents.toString();
  }

  private static compressBuffer(buff: Buffer): Buffer {
    return zlib.deflateSync(buff);
  }

  private static decompressBuffer(buff: Buffer): Buffer {
    return zlib.inflateSync(buff);
  }
}
