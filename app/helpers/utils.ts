import fs from "fs";
import crypto from "crypto";
import path from "path";
import { FileMode, GitObjectType } from "../constants";

const ascii = {
  null: 0,
  space: 32,
};

type ParsedBuffer = {
  offset: number;
  contents: string;
};

const readBufferUntilChar = (
  buffer: Buffer,
  offset: number = 0,
  asciiCode: number
): ParsedBuffer => {
  let contents = "";
  while (offset < buffer.length && buffer[offset] !== asciiCode) {
    contents += String.fromCharCode(buffer[offset]);
    offset++;
  }
  offset++; // Skip the char
  return { offset, contents };
};

export const readUntilSpace = (
  buffer: Buffer,
  offset: number = 0
): ParsedBuffer => readBufferUntilChar(buffer, offset, ascii.space);

export const readUntilNullByte = (
  buffer: Buffer,
  offset: number = 0
): ParsedBuffer => readBufferUntilChar(buffer, offset, ascii.null);

export const getFileModeFromPath = (path: string): FileMode => {
  try {
    fs.accessSync(path, fs.constants.X_OK);
    return FileMode.Executable;
  } catch {
    return FileMode.File;
  }
};

const getDirentFileMode = (dirent: fs.Dirent): FileMode => {
  if (dirent.isDirectory()) {
    return FileMode.Directory;
  }
  if (dirent.isFile()) {
    return getFileModeFromPath(path.join(dirent.parentPath, dirent.name));
  }
  if (dirent.isSymbolicLink()) {
    return FileMode.SymbolicLink;
  }
  throw new Error(`Invalid file mode: ${dirent.name}`);
};

export const getFileMode = (mode: number | string | fs.Dirent): FileMode => {
  if (typeof mode === "number" || typeof mode === "string") {
    switch (mode) {
      case 100644:
      case "100644":
        return FileMode.File;
      case 100755:
      case "100755":
        return FileMode.Executable;
      case 120000:
      case "120000":
        return FileMode.SymbolicLink;
      case 40000:
      case "40000":
      case "040000":
        return FileMode.Directory;
      default:
        throw new Error(`Invalid file mode: ${mode}`);
    }
  }
  return getDirentFileMode(mode);
};

export const getObjectType = (buffer: Buffer | string): GitObjectType => {
  let type = "";
  if (typeof buffer === "string") {
    type = buffer;
  } else {
    type = readUntilSpace(buffer).contents;
  }
  switch (type) {
    case "blob":
      return GitObjectType.Blob;
    case "tree":
      return GitObjectType.Tree;
    case "commit":
      return GitObjectType.Commit;
    case "tag":
    default:
      throw new Error(`Invalid object type: ${type}`);
  }
};

export const generateSha1Hash = (contents: Buffer | string): string => {
  return crypto.createHash("sha1").update(contents).digest("hex");
};

export const getTimezoneOffsetString = (date: Date): string => {
  const offsetMinutes = date.getTimezoneOffset();
  const sign = offsetMinutes > 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);

  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");

  return `${sign}${hours}${minutes}`;
};
