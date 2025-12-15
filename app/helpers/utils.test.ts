import { expect, test } from "bun:test";

import { readUntilSpace, readUntilNullByte } from "./utils";

test("readUntilSpace", () => {
  const buffer = Buffer.from("Hello World");
  const { offset, contents } = readUntilSpace(buffer, 0);
  expect(contents).toBe("Hello");
  expect(offset).toBe(6);
});

test("readUntilNullByte", () => {
  const buffer = Buffer.from("Hello Null\0World");
  const { offset, contents } = readUntilNullByte(buffer, 0);
  expect(contents).toBe("Hello Null");
  expect(offset).toBe(11);
});
