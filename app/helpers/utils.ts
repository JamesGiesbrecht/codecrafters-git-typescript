import fs from "fs";
import crypto from "crypto";
import path from "path";
import { BIT_MASKS, FileModeEnum, GitObjectTypeEnum } from "../constants";

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
  asciiCode: number,
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
  offset: number = 0,
): ParsedBuffer => readBufferUntilChar(buffer, offset, ascii.space);

export const readUntilNullByte = (
  buffer: Buffer,
  offset: number = 0,
): ParsedBuffer => readBufferUntilChar(buffer, offset, ascii.null);

export const getFileModeFromPath = (path: string): FileModeEnum => {
  try {
    fs.accessSync(path, fs.constants.X_OK);
    return FileModeEnum.Executable;
  } catch {
    return FileModeEnum.File;
  }
};

const getDirentFileMode = (dirent: fs.Dirent): FileModeEnum => {
  if (dirent.isDirectory()) {
    return FileModeEnum.Directory;
  }
  if (dirent.isFile()) {
    return getFileModeFromPath(path.join(dirent.parentPath, dirent.name));
  }
  if (dirent.isSymbolicLink()) {
    return FileModeEnum.SymbolicLink;
  }
  throw new Error(`Invalid file mode: ${dirent.name}`);
};

export const getFileMode = (
  mode: number | string | fs.Dirent,
): FileModeEnum => {
  if (typeof mode === "number" || typeof mode === "string") {
    switch (mode) {
      case 100644:
      case "100644":
        return FileModeEnum.File;
      case 100755:
      case "100755":
        return FileModeEnum.Executable;
      case 120000:
      case "120000":
        return FileModeEnum.SymbolicLink;
      case 40000:
      case "40000":
      case "040000":
        return FileModeEnum.Directory;
      case 160000:
      case "160000":
        return FileModeEnum.Submodule;
      default:
        throw new Error(`Invalid file mode: ${mode}`);
    }
  }
  return getDirentFileMode(mode);
};

export const getObjectType = (buffer: Buffer | string): GitObjectTypeEnum => {
  let type = "";
  if (typeof buffer === "string") {
    type = buffer;
  } else {
    type = readUntilSpace(buffer).contents;
  }
  switch (type) {
    case "blob":
      return GitObjectTypeEnum.Blob;
    case "tree":
      return GitObjectTypeEnum.Tree;
    case "commit":
      return GitObjectTypeEnum.Commit;
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

export const hexToDecimal = (hexStr: string): number => {
  return parseInt(hexStr, 16);
};

export const decimalToHex = (num: number): string => {
  // Padded to 4 bytes
  // EX: 001e
  return num.toString(16).padStart(4, "0");
};

export const stripNewlines = (str: string): string => {
  return str.replaceAll("\n", "");
};

export const withSizeHeader = (str: string): string => {
  // Add 4 bytes for length header
  return decimalToHex(str.length + 4) + str;
};

export const getMSB = (num: number): 1 | 0 => {
  return num & BIT_MASKS.HIGH_1 ? 1 : 0;
};

export const decodeSizeWithMSB = (
  buffer: Buffer,
  bufferOffset: number,
): { size: number; offset: number } => {
  let offset = bufferOffset;
  const first = buffer[offset];
  let size = first & BIT_MASKS.LOW_7;
  let hasMore = getMSB(first) !== 0;
  let shift = 7;
  offset++;

  while (hasMore) {
    const next = buffer[offset];
    size |= (next & BIT_MASKS.LOW_7) << shift;
    offset++;
    hasMore = getMSB(next) !== 0;
    shift += 7;
  }

  return { size, offset };
};
