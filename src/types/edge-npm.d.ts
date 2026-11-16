// Edge-function modules (Deno) use npm: specifiers; tests import their pure
// policy code, so map the specifier to the same package for type-checking.
declare module 'npm:zod@3' {
  export * from 'zod';
}
