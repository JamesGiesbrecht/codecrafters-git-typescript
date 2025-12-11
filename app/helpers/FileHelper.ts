import fs from "fs";
import path from "path";
import zlib from "node:zlib";
import { GIT_DIRS } from "../constants";

export default class FileHelper {
  public static getGitObjectContents(hash: string): string {
    const subDir = hash.substring(0, 2);
    const file = hash.substring(2);
    const blob = fs.readFileSync(path.join(GIT_DIRS.OBJECTS, subDir, file));
    const decompressedBuffer = zlib.unzipSync(new Uint8Array(blob));
    const nullByteIndex = decompressedBuffer.indexOf(0);
    const fileContents = decompressedBuffer
      .subarray(nullByteIndex + 1)
      .toString();
    return fileContents;
  }

  public static writeGitObject(hash: string, contents: string): void {
    const subDir = hash.substring(0, 2);
    const file = hash.substring(2);
    const dir = path.join(GIT_DIRS.OBJECTS, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const compressed = zlib.deflateSync(contents);
    fs.writeFileSync(path.join(dir, file), new Uint8Array(compressed));
  }

  public static getFileContents(filePath: string): string {
    const fileContents = fs.readFileSync(filePath);
    return fileContents.toString();
  }
}
