import * as fs from "fs";
import crypto from "crypto";
import { GIT_DIRS, GIT_FILES } from "./constants";
import FileHelper from "./helpers/FileHelper";

export default class GitRepo {
  public static async init() {
    fs.mkdirSync(GIT_DIRS.GIT, { recursive: true });
    fs.mkdirSync(GIT_DIRS.OBJECTS, { recursive: true });
    fs.mkdirSync(GIT_DIRS.REFS, { recursive: true });
    fs.writeFileSync(GIT_FILES.HEAD, "ref: refs/heads/main\n");
    console.log("Initialized git directory");
  }

  public static catFile(commitHash: string): string {
    const file = FileHelper.getGitObjectContents(commitHash);
    return file;
  }

  public static hashFile(filePath: string): string {
    const fileContents = FileHelper.getFileContents(filePath);
    const blob = `blob ${fileContents.length}\0${fileContents}`;
    const hash = crypto.createHash("sha1").update(blob).digest("hex");
    FileHelper.writeGitObject(hash, blob);
    return hash;
  }
}
