import { COMMANDS } from "./constants";
import GitRepo from "./GitRepo";

const args = process.argv.slice(2);

type ParsedArgs = {
  [key: string]: string | boolean;
};

const parseArgs = (args: string[]): ParsedArgs => {
  const argMap: ParsedArgs = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      // Strip leading hyphens - or --
      const key = arg.replace(/^--?/, "");
      let value: string | boolean = true;
      if (args[i + 1] && !args[i + 1].startsWith("-")) {
        value = args[i + 1];
        // Arg was a value, skip for next iteration
        i++;
      }
      argMap[key] = value;
    }
  }
  return argMap;
};

const command = args[0];
const parsedArgs = parseArgs(args.slice(1));

switch (command) {
  case COMMANDS.INIT:
    GitRepo.init();
    break;
  case COMMANDS.CAT_FILE:
    const catFileHash = parsedArgs["p"] as string;
    const fileContents = GitRepo.catFile(catFileHash);
    process.stdout.write(fileContents);
    break;
  case COMMANDS.HASH_OBJECT:
    const filePath = parsedArgs["w"] as string;
    const hashObjectHash = GitRepo.hashFile(filePath);
    process.stdout.write(hashObjectHash);
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}
