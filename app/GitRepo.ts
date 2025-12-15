import * as fs from "fs";
import crypto from "crypto";
import { GIT_DIRS, GIT_FILES, GitObjectType } from "./constants";
import FileHelper from "./helpers/FileHelper";
import type { ParsedArgs } from "./types";
import { parseObject, parseTree } from "./helpers/utils";

export default class GitRepo {
  public static async init() {
    fs.mkdirSync(GIT_DIRS.GIT, { recursive: true });
    fs.mkdirSync(GIT_DIRS.OBJECTS, { recursive: true });
    fs.mkdirSync(GIT_DIRS.REFS, { recursive: true });
    fs.writeFileSync(GIT_FILES.HEAD, "ref: refs/heads/main\n");
    console.log("Initialized git directory");
  }

  public static catFile(commitHash: string): string {
    const fileBuffer = FileHelper.loadObjectBuffer(commitHash);
    const content = parseObject(fileBuffer).content;
    return content;
  }

  public static hashFile(filePath: string): string {
    const fileContents = FileHelper.getFileContents(filePath);
    const blob = `${GitObjectType.Blob} ${fileContents.length}\0${fileContents}`;
    const hash = crypto.createHash("sha1").update(blob).digest("hex");
    FileHelper.writeGitObject(hash, blob);
    return hash;
  }

  public static lsTree(commitHash: string, flags: ParsedArgs = {}): string {
    const treeBuffer = FileHelper.loadObjectBuffer(commitHash);
    const nameOnly = flags["name-only"] === true;
    const tree = parseTree(treeBuffer);

    // console.log({
    //   bufStr: treeBuffer.toString(),
    //   entries: tree.entries,
    // });

    if (nameOnly) {
      /**
       * <file1>
       * <file2>
       * <file3>
       */
      return (
        tree.entries.map((entry) => entry.name).join("\n") +
        (tree.entries.length > 0 ? "\n" : "")
      );
    }
    /**
     * 100644 blob 37cef192599bc823c9575a9a04bf71ff665ac516    <file1>
     * 040000 tree fdb70afa78cb712038679107e90c846946a48747    <dir1>
     * 040000 tree f06e35fbb333349bbe7e3f65380181e482e09d40    <dir2>
     * 100644 blob d92d1f55d80143cb7ed5a685a523a63cf0ec3c93    <file2>
     */
    return (
      tree.entries
        .map(
          (entry) =>
            `${entry.mode} ${entry.type} ${entry.hash}    ${entry.name}`
        )
        .join("\n") + (tree.entries.length > 0 ? "\n" : "")
    );
  }
}
