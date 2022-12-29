import type { ExecutionContext } from "ava";

/**
 * Wrapper on ava `t.assert()` that applies a TypeScript type assertion, to allow for narrowing
 */
export function assert<Ctx>(
  t: ExecutionContext<Ctx>,
  value: unknown,
  message?: string
): asserts value {
  t.assert(value, message);
}

/**
 * Wrapper on ava `t.is()` that applies a TypeScript type assertion, to allow for narrowing
 */
export function assertIs<Ctx, A, B extends A>(
  t: ExecutionContext<Ctx>,
  a: A,
  b: B,
  message?: string
): asserts a is B {
  t.is(a, b, message);
}

/**
 * Wrapper on ava `t.not()` that applies a TypeScript type assertion, to allow for narrowing
 */
export function assertNot<Ctx, A, B extends A>(
  t: ExecutionContext<Ctx>,
  a: A,
  b: B,
  message?: string
): asserts a is Exclude<A, B> {
  t.not(a, b, message);
}
