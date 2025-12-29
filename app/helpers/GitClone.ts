import { CONSTANTS } from "../constants";
import { hexToDecimal, withSizeHeader, stripNewlines } from "./utils";

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
  const wantLines: WantLine[] = refFile.refs.map(
    (ref) => new WantLine(ref.sha)
  );
  const packFiles = await fetchPackFiles(url, wantLines);
  // console.log({ refFile, refs: refFile.refs });
  throw new Error("Clone not implemented");
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
    refs: [],
  };

  // Skip service name line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    console.log(`line ${i}: ${line}`);

    if (line.includes(NULL_BYTE)) {
      const [head, capabilities] = line.split(NULL_BYTE);
      refFile.headSha = head.split(" ")[0];
      refFile.capabilities = capabilities.split(" ");
    } else {
      const [sha, ref] = line.split(" ");
      refFile.refs.push({ sha, name: ref });
    }
  }

  return refFile;
};

const fetchPackFiles = async (
  url: string,
  wantLines: WantLine[]
): Promise<void> => {
  const body = Buffer.concat([
    ...wantLines.map((wl) => wl.toBuffer()),
    Buffer.from(`${FLUSH_PKT}${withSizeHeader("done\n")}`),
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
  const text = await res.text();
  console.log({ text });
  // const blob = await res.blob();
  // console.log({ blob: await blob.arrayBuffer() });
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
    const pktLenStr = buffer.subarray(offset, offset + 4).toString();

    // console.log(`pktLenStr: ${pktLenStr}`);
    // Exclude flush packets from response
    if (pktLenStr === FLUSH_PKT) {
      // Flush byte
      offset += 4;
      continue;
    }
    const pktLen = hexToDecimal(pktLenStr);
    const pktPayload = buffer.subarray(offset + 4, offset + pktLen).toString();
    // console.log({ pktLen, pktPayload });
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

class PackFile {}
