import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { parseCaseRiskBucket, parseCaseScope } from "./cases.parsers";

void test("parseCaseScope 接受 mine/group/all", () => {
  assert.equal(parseCaseScope("mine"), "mine");
  assert.equal(parseCaseScope("group"), "group");
  assert.equal(parseCaseScope("all"), "all");
});

void test("parseCaseScope 缺省值返回 undefined", () => {
  assert.equal(parseCaseScope(undefined), undefined);
});

void test("parseCaseScope 非法值抛 400", () => {
  assert.throws(() => parseCaseScope("invalid"), BadRequestException);
});

void test("parseCaseRiskBucket 接受合法的并集桶值", () => {
  for (const v of ["any", "high", "billing", "validation"] as const) {
    assert.equal(parseCaseRiskBucket(v), v);
  }
});

void test("parseCaseRiskBucket 缺省/空字符串返回 undefined", () => {
  assert.equal(parseCaseRiskBucket(undefined), undefined);
  assert.equal(parseCaseRiskBucket(""), undefined);
});

void test("parseCaseRiskBucket 非法字符串抛 400", () => {
  assert.throws(() => parseCaseRiskBucket("critical"), BadRequestException);
  assert.throws(() => parseCaseRiskBucket("HIGH"), BadRequestException);
});

void test("parseCaseRiskBucket 非字符串类型抛 400", () => {
  assert.throws(() => parseCaseRiskBucket(123), BadRequestException);
  assert.throws(() => parseCaseRiskBucket(true), BadRequestException);
  assert.throws(() => parseCaseRiskBucket({}), BadRequestException);
});
