<h1>A#</h1>

A dynamically typed functional programming language that I made to learn about compilers and interpreters. It's inspired by F#, JavaScript and Lisp and compiles to JavaScript or runs in a Node.js interpreter.

There is a very simple core library (`io`, `list` and `string`) that probably lacks what one would need for a real world app.

## Highlights

- identifiers are `kebab-case` ❤️. Everyone should do this. Seriously.
- list without separators `[1 2 3]`
- objects without separators `{ name "John" }`

## Prerequisites

- Node.js

## Usage

```bash
node a-sharp.js <file-name> [options]
```

Without options this will compile an A# file to JavaScript and output the result in the shell.

### CLI Options

- `--out <dir-name>` Compile a file and its dependencies, put everything in `<dir-name>`
- `--eval` Evaluate a file
- `--ast` Print the AST
- `--tokens` Print the tokens
- `--source` Print the source code

### VS Code Syntax highlighting

To enable syntax colors, symlink the `vscode-asharp` folder to you VS Code extensions folder. Syntax highlighting is enabled for files with the `.asharp` extension.

## Examples

![a-sharp-list](https://user-images.githubusercontent.com/13281350/76029538-f4e7ee00-5f34-11ea-86b2-361ee822857b.png)
![a-sharp-object](https://user-images.githubusercontent.com/13281350/76029542-f6b1b180-5f34-11ea-95a3-84f220ba2e89.png)
![a-sharp-string](https://user-images.githubusercontent.com/13281350/76029545-f74a4800-5f34-11ea-9973-8c4ebf8a9e8d.png)
