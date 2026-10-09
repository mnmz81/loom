---
title: "Rust: borrowing"
summary: "How & and &mut work and why the compiler complains."
date: 2026-10-05
tags: [rust]
series: { key: learning-rust, order: 2 }
---

In the previous post we saw that passing a value to a function moves ownership. Usually we only want the function to look at the value, or change it, and then get it back. That is what references are for: instead of moving the value, you borrow it.

## Shared reference: `&T`

`&T` gives read-only access. Ownership stays with the original variable:

```rust
fn len(s: &String) -> usize {
    s.len()
}

let name = String::from("Rust");
let n = len(&name);
println!("{name} has {n} bytes"); // name is still valid
```

You can hold several shared references to the same value at once.

## Mutable reference: `&mut T`

To change a borrowed value you need `&mut`, and the original variable must be `mut` too:

```rust
fn shout(s: &mut String) {
    s.push('!');
}

let mut greeting = String::from("hi");
shout(&mut greeting);
println!("{greeting}"); // hi!
```

## The borrowing rules

At any moment you may have either:

- any number of `&T` references that only read, **or**
- exactly one `&mut T` reference.

On top of that, a reference can never outlive the value it points to — there are no dangling references.

### Why the compiler complains

This is the classic error:

```rust
let mut v = vec![1, 2, 3];
let first = &v[0];   // shared borrow
v.push(4);           // error[E0502]: cannot borrow `v` as mutable
                     // because it is also borrowed as immutable
println!("{first}");
```

It is not pedantry: `push` may reallocate the vector's buffer, and `first` would then point to freed memory.

### The fix

A borrow ends at the last use of the reference (Non-Lexical Lifetimes), not at the end of the scope. Reordering the code is enough:

```rust
let mut v = vec![1, 2, 3];
let first = v[0];    // i32 is Copy, so copy instead of borrowing
v.push(4);
println!("{first}");
```

Or use the reference before the `push`, so the borrow is already over.

## In short

- `&` to read, `&mut` to write.
- Many readers or one writer — never both at once.
- When the compiler complains, look for a reference still in use after a mutation.
