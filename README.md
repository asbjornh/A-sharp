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

## Syntax overview

#### Whitespace

A# is not whitespace sensitive. Semicolons are used to separate expressions. Blocks/scopes are created by enclosing a sequence of expressions in `(` `)`.

#### Import module

```js
import io from "io";
import { map filter } from "list";
```

#### Export

```js
export my-func a b = a - b;
```

#### Assignment

```js
let a = 1;
```

#### Function definition

```js
let add a b = a + b;
let add = (a b => a + b);

// With multiple expressions:
let make-something a b = (
  let something = a + b;
  something + 3; // The last expression is returned
)
```

#### Function application

```js
let three = add 1 2;

let add-two = add 2;
let four = add-two 2;
```

#### Lists

```js
let numers = [1 2 3 4];
let strings = ["one" "two" "three"];
let expressions = [(add 1) (add 2)];

// Destructuring
let (first :: rest) = numbers;

// Structural equality
[] == [];
[1 2] == [1 2];
```

#### Objects

```js
let person = {
  name "John Doe"
  age 29
  likes {
    cats true
    people false
  }
};

// Structural equality
{} == {};
{ a 1 } == { a 1 };
```

#### Object property access

```js
let name = person.name;

let get-names = list.map _.name;
// The above is syntax sugar for:
let get-names = list.map (user => user.name)
```

#### Control flow

```fs
// If-expression
if something == 2
then "yes"
else if something == 3
  then "YES"
  else "no";

// Ternary-expression
something == 2 ? "yes" : "false";
```

#### Pipelines

```js
[1 2 3 4]
  |> list.map <| (+) 1
  |> list.reduce (+)
```

#### Composition

```js
let add-one-and-sum =
  list.map ((+) 1) >> list.reduce (+)

let add-one-and-sum =
  list.reduce (+) << list.map ((+) 1)
```

#### Operators

Operators can be partially applied using parenthesized prefix notation (`(+)`, `(-) 1`, `(/) 2` etc). When partially applying operators, the arguments are given in reverse (`(/) 2 1` is equivalent to `1 / 2`)

```fs
+  // Addition
-  // Subtraction
/  // Division
%  // Modulus
*  // Multiplication
** // Exponentiation (power)
:: // Cons (prepend element to list)
@  // Concat
<= // Less than or equal
>= // Greater than or equal
<  // Less than
>  // Greater than
== // Equals
!= // Not equals
|| // Or
&& // And
|> // Left-to-right pipe
<| // Right-to-left pipe
>> // Left-to-right function composition
<< // Right-to-left function composition
```
