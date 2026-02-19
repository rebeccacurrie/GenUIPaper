import { generateSpec } from "./genSpec";

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  if (fn()) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.error(`FAIL: ${name}`);
    failed++;
  }
}

// 1. Idempotency
test("Idempotency — same prompt returns identical spec", () => {
  const a = generateSpec("show table");
  const b = generateSpec("show table");
  return deepEqual(a, b);
});

// 2. Case-insensitivity
test("Case-insensitivity — uppercase equals lowercase", () => {
  const upper = generateSpec("SHOW TABLE");
  const lower = generateSpec("show table");
  return deepEqual(upper, lower);
});

// 3. Equivalent prompt
test("Equivalent prompt — 'display table' equals 'show table'", () => {
  const a = generateSpec("display table");
  const b = generateSpec("show table");
  return deepEqual(a, b);
});

// 4. Type correctness
test("Type correctness — every element type is a valid catalog component", () => {
  const validTypes = ["Card", "Metric", "Table", "Chart", "Text"];
  const prompts = ["show table", "show average", "show chart", "hello"];
  return prompts.every((p) => {
    const spec = generateSpec(p);
    return Object.values(spec.elements).every((el) =>
      validTypes.includes((el as { type: string }).type)
    );
  });
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
