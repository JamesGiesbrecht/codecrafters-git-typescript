import { COMMANDS, DEFAULT_PARSED_ARGS } from "./constants";
import GitRepo from "./GitRepo";
import type { ParsedArgs } from "./types";

const args = process.argv.slice(2);

const parseArgs = (args: string[]): ParsedArgs => {
  const argMap: ParsedArgs = DEFAULT_PARSED_ARGS;

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
      argMap.positional.push(arg);
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
    {
      const sha = (parsedArgs["p"] as string) || parsedArgs.positional[0];
      const fileContents = GitRepo.catFile(sha);
      process.stdout.write(fileContents);
    }
    break;
  case COMMANDS.HASH_OBJECT:
    {
      const filepath = (parsedArgs["w"] as string) || parsedArgs.positional[0];
      const sha = GitRepo.hashObject(filepath);
      process.stdout.write(sha);
    }
    break;
  case COMMANDS.LS_TREE:
    {
      const sha = parsedArgs.positional[0];
      const treeData = GitRepo.lsTree(sha, parsedArgs);
      process.stdout.write(treeData);
    }
    break;
  case COMMANDS.WRITE_TREE:
    {
      const dirPath = parsedArgs.positional[0];
      const treeSha = GitRepo.writeTree(dirPath);
      process.stdout.write(treeSha);
    }
    break;
  case COMMANDS.COMMIT_TREE:
    {
      const treeSha = parsedArgs.positional[0];
      const parentSha = parsedArgs["p"] as string;
      const message = parsedArgs["m"] as string;
      const commitSha = GitRepo.commitTree(treeSha, parentSha, message);
      process.stdout.write(commitSha);
    }
    break;
  case COMMANDS.CLONE:
    {
      const url = parsedArgs.positional[0];
      const dest = parsedArgs.positional[1];
      await GitRepo.clone(url, dest);
    }
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}
