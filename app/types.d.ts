import type {
  FileModeEnum,
  GitObjectTypeEnum,
  PackFileObjectTypeEnum,
} from "./constants";

export type ParsedArgs = {
  positional: string[];
  [key: string]: string | boolean | string[];
};

export type GitIdentity = {
  name: string;
  email: string;
};

export interface PackFileObjectHeader {
  size: number;
  type: PackFileObjectTypeEnum;
  reference?: string;
}

export interface PackFileObject {
  header: PackFileObjectHeader;
  data: Buffer;
}
