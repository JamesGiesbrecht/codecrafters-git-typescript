import { COMMANDS } from "./constants";
import GitRepo from "./GitRepo";
import type { ParsedArgs } from "./types";

const args = process.argv.slice(2);

const parseArgs = (args: string[]): ParsedArgs => {
  const argMap: ParsedArgs = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      // Long option
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        argMap[key] = value;
      } else {
        const key = arg.slice(2);
        argMap[key] = true;
      }
    } else if (arg.startsWith("-")) {
      // Short option (single hyphen). Treat next token as its value if it doesn't start with '-'
      const key = arg.replace(/^-/, "");
      if (args[i + 1] && !args[i + 1].startsWith("-")) {
        argMap[key] = args[i + 1];
        i++;
      } else {
        argMap[key] = true;
      }
    } else {
      // Positional argument
      positional.push(arg);
    }
  }

  if (positional.length > 0) argMap["_"] = positional;

  return argMap;
};

const command = args[0];
const parsedArgs = parseArgs(args.slice(1));

switch (command) {
  case COMMANDS.INIT:
    GitRepo.init();
    break;
  case COMMANDS.CAT_FILE:
    {
      const positional = (parsedArgs["_"] as string[]) || [];
      const hash = (parsedArgs["p"] as string) || positional[0];
      const fileContents = GitRepo.catFile(hash);
      process.stdout.write(fileContents);
    }
    break;
  case COMMANDS.HASH_OBJECT:
    {
      const positional = (parsedArgs["_"] as string[]) || [];
      const filepath = (parsedArgs["w"] as string) || positional[0];
      const hash = GitRepo.hashObject(filepath);
      process.stdout.write(hash);
    }
    break;
  case COMMANDS.LS_TREE:
    {
      const positional = (parsedArgs["_"] as string[]) || [];
      const hash = positional[0];
      const treeData = GitRepo.lsTree(hash, parsedArgs);
      process.stdout.write(treeData);
    }
    break;
  case COMMANDS.WRITE_TREE:
    {
      const positional = (parsedArgs["_"] as string[]) || [];
      const dirPath = positional[0];
      const treeHash = GitRepo.writeTree(dirPath);
      process.stdout.write(treeHash);
    }
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}
