[![progress-banner](https://backend.codecrafters.io/progress/git/a4abbf06-b236-4bd4-aee2-3b580852da82)](https://app.codecrafters.io/users/codecrafters-bot?r=2qF)

# 🔧 Git Implementation in TypeScript

A lightweight implementation of core Git functionality built from scratch in TypeScript/Bun. This project implements Git's internal object model, packfile protocol, and essential commands for version control operations.

Built as part of the [CodeCrafters](https://codecrafters.io) "Build your own Git" challenge.

## 📋 Overview

This is a functional Git implementation that handles:

- Repository initialization
- Object storage and retrieval (blobs, trees, commits)
- Hash object creation and manipulation
- Tree operations and directory traversal
- Commit creation with parent tracking
- Repository cloning with packfile parsing
- Working directory checkout

Built as part of the [CodeCrafters](https://codecrafters.io) "Build Your Own Git" challenge.

## ✨ Features

### 🎯 **Core Commands**

- **`init`** - Initialize a new Git repository
- **`cat-file`** - Display contents of Git objects
- **`hash-object`** - Create blob objects from files
- **`ls-tree`** - List contents of tree objects
- **`write-tree`** - Create tree objects from working directory
- **`commit-tree`** - Create commit objects with metadata
- **`clone`** - Clone remote repositories with full packfile support

### 🔐 **Git Internals**

- **Object Storage**: Implements Git's content-addressable storage using SHA-1 hashing
- **Compression**: Uses zlib deflate/inflate for efficient storage
- **Packfile Protocol**: Full support for Git's packfile format including:
  - Pack header parsing
  - Object type identification (blob, tree, commit, tag)
  - Delta compression (ref-delta and ofs-delta)
  - Checksum validation

### 🌳 **Object Model**

Supports all core Git object types:

- **Blobs** - File content storage
- **Trees** - Directory structure
- **Commits** - Snapshots with metadata
- **Tags** - Named references (parsing support)

## 🚀 Getting Started

### Prerequisites

- **Bun** 1.1 or higher ([Install Bun](https://bun.sh))
- Basic understanding of Git concepts

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd codecrafters-git-typescript
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Run locally**

   ```bash
   ./your_program.sh <command> [args...]
   ```

## 📖 Usage

### Initialize a Repository

```bash
./your_program.sh init
```

Creates a new `.git` directory with the standard structure:

```
.git/
├── objects/
├── refs/
└── HEAD
```

### Read Object Contents

```bash
./your_program.sh cat-file -p <object-hash>
```

Displays the contents of a Git object (blob, tree, commit, or tag).

### Create Object from File

```bash
./your_program.sh hash-object -w <file-path>
```

Creates a blob object from a file and writes it to `.git/objects/`.

### List Tree Contents

```bash
./your_program.sh ls-tree --name-only <tree-hash>
```

Lists all files and directories in a tree object.

### Create Tree from Working Directory

```bash
./your_program.sh write-tree
```

Recursively creates tree objects for the current directory structure.

### Create a Commit

```bash
./your_program.sh commit-tree <tree-hash> -p <parent-hash> -m "Commit message"
```

Creates a commit object with the specified tree and parent commit.

### Clone a Repository

```bash
./your_program.sh clone <repository-url> <directory>
```

Clones a remote repository including:

- Fetching all objects via packfile
- Parsing delta-compressed objects
- Checking out the working directory
- Setting up HEAD and refs

## 🔍 Technical Details

### Object Storage Format

Git objects are stored in `.git/objects/<xx>/<yy...>` where `<xxyy...>` is the SHA-1 hash.

**Object Format:**

```txt
<type> <size>\0<content>
```

### Tree Object Format

```txt
<mode> <name>\0<20-byte-hash><mode> <name>\0<20-byte-hash>
```

**Modes:**

- `100644` - Regular file
- `100755` - Executable file
- `40000` - Directory (tree)
- `120000` - Symbolic link

### Commit Object Format

```txt
tree <tree-hash>
parent <parent-hash>
author <name> <email> <timestamp> <timezone>
committer <name> <email> <timestamp> <timezone>

<commit message>
```

### Packfile Format

**Header:**

```txt
PACK<version><object-count>
```

## 🧪 Testing

### Codecrafters

Run tests against the CodeCrafters CLI:

```sh
codecrafters test
```

### Local Testing

Pull codecrafters `git-tester` submodule:

  ```sh
  git submodule update --init --recursive
  ```

Build `git-tester` binary

  ```sh
  bun build:tester
  ```

Install dependencies

  ```sh
  bun install
  ```

Create `.env` and set `CURRENT_STAGE` variable

  ```sh
  echo "CURRENT_STAGE=1" > .env
  ```

Run codecrafters tests locally

  ```sh
  bun test codecrafters
  ```

## 📄 Resources

- [Git-Protocol Forum Guide](https://i27ae15.github.io/git-protocol-doc/docs/git-protocol/intro)
- [git http-protocol](https://git-scm.com/docs/http-protocol)
- [git protocol-pack](https://git-scm.com/docs/gitprotocol-pack)
- [git format-pack](https://git-scm.com/docs/gitformat-pack)
- [Unpacking Git Packfiles](https://codewords.recurse.com/issues/three/unpacking-git-packfiles)
