---
title: "Decorators in TypeScript: the standard version vs experimentalDecorators"
summary: "What a decorator is, a standard method and class decorator, why Node can't run them, and how experimentalDecorators, which new Angular projects still enable, differs."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 15 }
---

A decorator is a function that receives a class or a class member, and can return something to replace it. You write it with `@` before the declaration. If you've worked with Angular, you know them from every file: `@Component`, `@Injectable`.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24 with tsx.

## A method and a class decorator

```typescript
// logged.ts (run with tsx)
function logged(method: (...args: number[]) => number, context: ClassMethodDecoratorContext) {
  return function (this: unknown, ...args: number[]) {
    console.log(`${String(context.name)}(${args.join(", ")})`);
    return method.apply(this, args);
  };
}

const registry: string[] = [];

function register(target: Function, context: ClassDecoratorContext) {
  registry.push(String(context.name));
}

@register
class Calculator {
  @logged
  add(a: number, b: number) {
    return a + b;
  }
}

console.log(registry);
console.log(new Calculator().add(2, 3));
```

```text
[ 'Calculator' ]
add(2, 3)
5
```

A [standard decorator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators) takes two parameters: the thing it's written on (the method or the class) and a `context` object with details about it, like `context.name`.

- `logged` returns a new function, which replaces `add`: it prints the call and then calls the original method.
- `register` returns nothing, so the class stays as it is. It runs when the class is defined, before any instance is created, which is why `registry` is already filled on the first line of output.

## Node doesn't run decorators

```bash
node logged.ts
```

```text
SyntaxError: Invalid or unexpected token
```

Decorators are a [TC39 Stage 3 proposal](https://github.com/tc39/proposal-decorators), and JavaScript doesn't support them yet. According to [the Node docs](https://nodejs.org/api/typescript.html), type stripping doesn't transform them, and the result is a parser error. `erasableSyntaxOnly` doesn't report them, so the error only shows up when you run the code. tsx transforms them into plain JavaScript.

## experimentalDecorators

Before TypeScript 5.0 there were only "experimental" decorators, based on a much older version of the proposal and requiring the `experimentalDecorators` option. Their signature is different: `(target, propertyKey, descriptor)` instead of `(value, context)`. The same file with the option on:

```bash
npx tsc --noEmit --experimentalDecorators logged.ts
```

```text
logged.ts(15,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
logged.ts(17,4): error TS1241: Unable to resolve signature of method decorator when called as an expression.
  Argument of type 'Calculator' is not assignable to parameter of type '(...args: number[]) => number'.
    Type 'Calculator' provides no match for the signature '(...args: number[]): number'.
logged.ts(17,4): error TS1270: Decorator function return type '(this: unknown, ...args: number[]) => number' is not assignable to type 'void | TypedPropertyDescriptor<(a: number, b: number) => number>'.
```

The option switches every decorator in the project to the old version, so a decorator written for one version usually doesn't work in the other. Some things only the old version can do: decorators on parameters, and `emitDecoratorMetadata`. The 5.0 release notes say `experimentalDecorators` will continue to exist "for the foreseeable future".

## Angular

The `ng new` template in Angular 22 still writes `"experimentalDecorators": true` in `tsconfig.json` ([in the Angular CLI source](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/workspace/files/tsconfig.json.template)), and so does this blog's Angular 22 project. `@Component` and `@Injectable` are read by [the Angular compiler](https://angular.dev/tools/cli/aot-compiler) at build time, which generates the code that runs from the information in them. It follows that in an Angular project, a decorator you write yourself has to match the old signature.

### In older versions

Alongside `experimentalDecorators` there is [`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig/#emitDecoratorMetadata): with it, `tsc` writes the parameter types into the code as runtime metadata, which `reflect-metadata` reads. Standard decorators don't support this.

## Mistakes beginners make

- **Copying a decorator from an example without checking `experimentalDecorators`.** The signatures differ, and `tsc` reports errors like TS1241.
- **Thinking a decorator runs on every call.** It runs once, when the class is defined. Only what it returns runs on every call.
- **Running code with decorators directly in `node`.** It's a syntax error. Run it with tsx, or compile first.

## What's next

Next: `as`, `satisfies`, type guards and assertion functions.
