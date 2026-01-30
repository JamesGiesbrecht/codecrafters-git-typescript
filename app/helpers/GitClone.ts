import zlib from "node:zlib";
import { BIT_MASKS, CONSTANTS, PackFileObjectTypeEnum } from "../constants";
import type { PackFileObject, PackFileObjectHeader } from "../types";
import {
  hexToDecimal,
  withSizeHeader,
  stripNewlines,
  getMSB,
  decodeSizeWithMSB,
} from "./utils";
import GitHelper from "./GitHelper";
import { GitBlob, GitCommit, GitObject, GitTree } from "../objects";

const { FLUSH_PKT, HEAD, NULL_BYTE } = CONSTANTS;

// Below is a sample git reference file
// The first four (hex) digits tell us how many bytes the line is, including the length header
// Four zeros, 0000, denote the end of a section (flush packet)
/**
 * GET {git_repo_url}/info/refs?service=git-upload-pack
 *
 * 001e# service=git-upload-pack
 *** Flush packet marking the end of the service announcement section, 015b, length of the line ***
 * 0000015b6a669f146a8cd82590d9a63b2ed7c3151770d35e HEAD{null}multi_ack thin-pack side-band side-band-64k ofs-delta shallow deepen-since deepen-not deepen-relative no-progress include-tag multi_ack_detailed allow-tip-sha1-in-want allow-reachable-sha1-in-want no-done symref=HEAD:refs/heads/master filter object-format=sha1 agent=git/github-60d715541676-Linux
 * 003f6a669f146a8cd82590d9a63b2ed7c3151770d35e refs/heads/master
 * 0000
 */

interface ReferenceFile {
  headSha: string; // Points to the HEAD pack file
  HEAD: string;
  refs: { sha: string; name: string }[];
  capabilities?: string[];
}

const urlPaths = {
  refs: "/info/refs?",
  gitUploadPack: "/git-upload-pack",
};

const services = {
  gitUploadPack: "service=git-upload-pack",
};

export const clone = async (url: string, dest: string): Promise<void> => {
  const refFile = await fetchRefs(url);
  GitHelper.initGitDirs(refFile.HEAD, dest);
  const wantLines: WantLine[] = refFile.refs.map(
    (ref) => new WantLine(ref.sha)
  );
  const packFile = await fetchPackFile(url, wantLines);
  packFile.objects.forEach((packFileObj) => {
    const { header } = packFileObj;
    switch (header.type) {
      case PackFileObjectTypeEnum.COMMIT:
        const commit = new GitCommit({ packFile: packFileObj }, dest);
        commit.write();
        break;
      case PackFileObjectTypeEnum.TREE:
        const tree = new GitTree({ packFile: packFileObj }, dest);
        tree.write();
        break;
      case PackFileObjectTypeEnum.BLOB:
        const blob = new GitBlob({ packFile: packFileObj }, dest);
        blob.write();
        break;
      case PackFileObjectTypeEnum.TAG:
        console.warn("Tag not implemented");
        break;
      case PackFileObjectTypeEnum.OFS_DELTA:
        console.warn("OFS Delta not implemented");
        break;
      case PackFileObjectTypeEnum.REF_DELTA:
        const refDelta = new RefDelta(packFileObj, dest);
        const object = refDelta.getTargetObject(dest);
        object.write();
        break;
    }
  });

  // Clone completed
};

const fetchRefs = async (url: string): Promise<ReferenceFile> => {
  const res = await fetch(url + urlPaths.refs + services.gitUploadPack);
  if (!res.ok && res.status !== 304) {
    throw new Error(`Failed to fetch ref file: ${res.statusText}`);
  }
  const text = await res.text();

  if (text.slice(-4) !== FLUSH_PKT) {
    throw new Error(
      `Reference file missing flush packet at end of response. Actual: "${text}"`
    );
  }
  const lines = parsePayload(text);
  // Verify response begins with the service name
  if (lines[0] !== `# ${services.gitUploadPack}`) {
    console.log(services.gitUploadPack);
    throw new Error(`Invalid reference file header: "${lines[0]}"`);
  }
  const refFile: ReferenceFile = {
    headSha: "",
    HEAD: "",
    refs: [],
  };

  // Skip service name line with i=1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(NULL_BYTE)) {
      // Line with HEAD and capabilities
      const [head, capabilities] = line.split(NULL_BYTE);
      refFile.headSha = head.split(" ")[0];
      refFile.capabilities = capabilities.split(" ");
      refFile.HEAD =
        refFile.capabilities
          .find((cap) => cap.startsWith("symref=HEAD:"))
          ?.split(":")[1] || "";
    } else {
      // Standard ref line
      const [sha, ref] = line.split(" ");
      refFile.refs.push({ sha, name: ref });
    }
  }

  return refFile;
};

const fetchPackFile = async (
  url: string,
  wantLines: WantLine[]
): Promise<PackFile> => {
  const body = Buffer.concat([
    ...wantLines.map((wl) => wl.toBuffer()),
    Buffer.from(`${FLUSH_PKT}${withSizeHeader("done\n")}`), // 00000009done\n
  ]);

  const res = await fetch(url + urlPaths.gitUploadPack, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-git-upload-pack-request",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch pack file: ${res.statusText}`);
  }
  const blob = await res.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return new PackFile(buffer);
};

const parsePayload = (payload: string): string[] => {
  const referenceFileValidationRegex = /^[0-9a-f]{4}#/;
  const validationBytes = payload.slice(0, 6);
  if (!validationBytes.match(referenceFileValidationRegex)) {
    throw new Error(
      `Invalid reference file pack. First 5 bytes must match ${referenceFileValidationRegex}. Actual: ${validationBytes}`
    );
  }

  const buffer = Buffer.from(payload);
  let offset = 0;
  const lines: string[] = [];

  while (offset < buffer.length) {
    // First 4 bytes represent line size, including size header
    const pktLenStr = buffer.subarray(offset, offset + 4).toString();

    // Exclude flush packets from response
    if (pktLenStr === FLUSH_PKT) {
      // Skip over flush byte
      offset += 4;
      continue;
    }
    const pktLen = hexToDecimal(pktLenStr);
    // Get length of line without relying on newlines
    const pktPayload = buffer.subarray(offset + 4, offset + pktLen).toString();
    lines.push(stripNewlines(pktPayload));
    offset += pktLen;
  }
  return lines;
};

class WantLine {
  private capabilities: string = "";

  constructor(private hash: string) {}

  private get wantStr() {
    if (this.capabilities) {
      return `want ${this.hash} ${this.capabilities}\n`;
    }
    return `want ${this.hash}\n`;
  }

  toString() {
    return withSizeHeader(this.wantStr);
  }

  toBuffer() {
    return Buffer.from(this.toString());
  }
}

class PackFile {
  VERSION: number;
  objectCount: number;

  constructor(private raw: Buffer) {
    // Ignore initial bits that are part of the Git negotiation phase
    // Start processing from "PACK"
    const startOfPack = this.raw.indexOf(Buffer.from("PACK"));
    if (startOfPack === -1) {
      throw new Error("PACK signature not found");
    }
    this.raw = this.raw.subarray(startOfPack);
    // Skip "PACK" signature and get the 4 bytes representing the version
    this.VERSION = this.raw.readUInt32BE(4);
    // Skip another 4 for to get the count
    this.objectCount = this.raw.readUInt32BE(8);
  }

  private readPackObjectHeader(offset: number) {
    const first = this.raw[offset];
    /**
     * The first bit of an object is the MSB, a 1 tells us that there are more bytes to follow
     * The second 3 bits are the type
     * The remaining 4 bits are the lowest bits (right side) of the objects size
     */
    let size = first & BIT_MASKS.LOW_4; // Low 4 bits, 0000 1111
    const type: PackFileObjectTypeEnum = (first >> 4) & BIT_MASKS.LOW_3; // Shift type bits to end and get low 3, 0000 0111

    let shift = 4; // Counts the bits to get the size
    let bytesRead = 1;
    let hasMore = getMSB(first) !== 0; // Check if MSB is a 1, 1000 0000

    while (hasMore) {
      const nextByte = this.raw[offset + bytesRead];
      size |= (nextByte & BIT_MASKS.LOW_7) << shift; // Mask MSB and shift to beginning of size
      hasMore = getMSB(nextByte) !== 0;
      shift += 7; // 7 more bits were added to size
      bytesRead++;
    }
    const header: PackFileObjectHeader = {
      size,
      type,
    };
    return { header, headerBytes: bytesRead };
  }

  get objects(): PackFileObject[] {
    let objs: PackFileObject[] = [];
    let offset = 12; // "PACK"(4) + version(4) + object count(4)
    for (let i = 0; i < this.objectCount; i++) {
      const { header, headerBytes } = this.readPackObjectHeader(offset);
      offset += headerBytes;

      if (header.type === PackFileObjectTypeEnum.REF_DELTA) {
        header.reference = this.raw.toString("hex", offset, offset + 20);
        offset += 20;
      }

      const { buffer: decompressedData, engine } = zlib.inflateSync(
        this.raw.subarray(offset),
        { info: true }
      ) as Buffer & { engine: zlib.Inflate };
      offset += engine.bytesWritten;

      const object: PackFileObject = {
        header,
        data: Buffer.from(decompressedData),
      };
      objs.push(object);
    }

    return objs;
  }
}

class RefDelta {
  private deltaBuffer: Buffer;
  private sourceBuffer: Buffer;
  private targetBuffer: Buffer;
  private sourceSize: number;
  private targetSize: number;

  constructor(deltaPackfileObject: PackFileObject, baseDir: string) {
    this.deltaBuffer = deltaPackfileObject.data;
    this.targetBuffer = Buffer.alloc(0);

    // Get size of source and target objects
    let offset = 0;
    const sourceResult = decodeSizeWithMSB(this.deltaBuffer, offset);
    this.sourceSize = sourceResult.size;
    offset = sourceResult.offset;
    const targetResult = decodeSizeWithMSB(this.deltaBuffer, offset);
    this.targetSize = targetResult.size;
    offset = targetResult.offset;

    // Load source object from disk
    const sourceObject = GitHelper.loadFromSha(
      deltaPackfileObject.header.reference!,
      baseDir
    );
    this.sourceBuffer = sourceObject.buffer;

    if (sourceObject.size !== this.sourceSize) {
      throw new Error(
        `Source object may be corrupted: expected ${this.sourceSize} bytes in size, got ${this.sourceBuffer.length}`
      );
    }
    // Build target object by parsing instructions
    this.parseInstructions(offset);
  }

  private parseInstructions(startOffset: number): void {
    let offset = startOffset;
    const out: Buffer[] = [];
    let outLength = 0;

    // Build target object
    while (offset < this.deltaBuffer.length) {
      const first = this.deltaBuffer[offset];
      offset++;
      if (getMSB(first) === 1) {
        // Copy instruction
        let copyOffset = 0;
        let copySize = 0;

        if (first & 0x01) {
          copyOffset |= this.deltaBuffer[offset];
          offset += 1;
        }
        if (first & 0x02) {
          copyOffset |= this.deltaBuffer[offset] << 8;
          offset += 1;
        }
        if (first & 0x04) {
          copyOffset |= this.deltaBuffer[offset] << 16;
          offset += 1;
        }
        if (first & 0x08) {
          copyOffset |= this.deltaBuffer[offset] << 24;
          offset += 1;
        }
        if (first & 0x10) {
          copySize |= this.deltaBuffer[offset];
          offset += 1;
        }
        if (first & 0x20) {
          copySize |= this.deltaBuffer[offset] << 8;
          offset += 1;
        }
        if (first & 0x40) {
          copySize |= this.deltaBuffer[offset] << 16;
          offset += 1;
        }

        if (copySize === 0) {
          copySize = 0x10000;
        }

        out.push(this.sourceBuffer.subarray(copyOffset, copyOffset + copySize));
        outLength += copySize;

        //   let copyOffset = 0;
        //   let copySize = 0;

        //   // Parse additional offset bytes (bits 0-3 of first indicate extras)
        //   // These 4 bits are the low 4 of the offset amount and also tell us how many of the following bytes belong to it
        //   let shift = 0;
        //   for (let i = 0; i < 4; i++) {
        //     // Check if the nth bit is set
        //     // 1 << 0 => 0000 0001; Checking if bit 0 is set
        //     // 1 << 1 => 0000 0010; Checking if bit 1 is set
        //     // etc.
        //     if (first & (1 << i)) {
        //       copyOffset |= this.deltaBuffer[offset] << shift;
        //       offset++;
        //       shift += 8;
        //     }
        //   }

        //   // Parse additional size bytes (bits 4-6 of first indicate extras)
        //   shift = 0;
        //   // Start loop at 4 to correspond with the position of the size data in `first`
        //   for (let i = 4; i < 7; i++) {
        //     if (first & (1 << i)) {
        //       copySize |= this.deltaBuffer[offset] << shift;
        //       offset++;
        //       shift += 8;
        //     }
        //   }
        //   if (copySize === 0) {
        //     copySize = 0x10000;
        //   }

        //   // Copy from source and append to target
        //   const data = this.sourceBuffer.subarray(
        //     copyOffset,
        //     copyOffset + copySize
        //   );
        //   console.log(`copyDataBuffer\n${data.toString()}`);
        //   this.targetBuffer = Buffer.concat([this.targetBuffer, data]);
      } else {
        // Add instruction
        const insertSize = first;
        out.push(this.deltaBuffer.subarray(offset, offset + insertSize));
        offset += insertSize;
        outLength += insertSize;

        // const addSize = first; // MSB=0, so value is the size
        // const data = this.deltaBuffer.subarray(offset, offset + addSize);
        // console.log(`addDataBuffer\n${data.toString()}`);
        // offset += addSize;
        // this.targetBuffer = Buffer.concat([this.targetBuffer, data]);
      }
    }
    this.targetBuffer = Buffer.concat(out);

    if (this.targetBuffer.length !== this.targetSize) {
      // console.log(`Source Buffer:\n${this.sourceBuffer.toString()}`);
      // console.log(`Target Buffer:\n${this.targetBuffer.toString()}`);
      throw new Error(
        `Target size mismatch: expected ${this.targetSize}, got ${this.targetBuffer.length}.`
      );
    }
  }

  getTargetObject(baseDir: string): GitObject {
    // console.log({ target: this.targetBuffer.toString() });
    return GitHelper.loadFromBuffer(this.targetBuffer, baseDir);
  }
}
