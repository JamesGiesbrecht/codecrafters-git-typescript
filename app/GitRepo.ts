import * as fs from "fs";
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

  public static catFile(commitHash: string) {
    const file = FileHelper.getGitObjectContents(commitHash);
    return file;
  }
}
