import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { GroupsController } from "./groups.controller";
import type { GroupMembersService } from "./groupMembers.service";
import type { GroupsService } from "./groups.service";
import type { GroupDetailDto, GroupListResultDto } from "./groups.types";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const GROUP_ID = "00000000-0000-4000-8000-00000000000b";

function makeReq(ctx?: Record<string, unknown>) {
  return {
    requestContext: ctx ?? {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "manager" as const,
    },
  };
}

function stubService(): GroupsService {
  return {
    listGroups: () =>
      Promise.resolve({ items: [], total: 0 } satisfies GroupListResultDto),
    getGroupDetail: () => Promise.resolve(null as unknown as GroupDetailDto),
    createGroup: () => Promise.resolve(null as unknown as GroupDetailDto),
    renameGroup: () => Promise.resolve(null as unknown as GroupDetailDto),
    disableGroup: () => Promise.resolve(null as unknown as GroupDetailDto),
    countReferences: () => Promise.resolve({ customerCount: 0, caseCount: 0 }),
  } as unknown as GroupsService;
}

function stubMembersService(
  overrides?: Record<string, unknown>,
): GroupMembersService {
  return {
    addGroupMember: () => Promise.resolve({}),
    removeGroupMember: () => Promise.resolve(),
    ...overrides,
  } as unknown as GroupMembersService;
}

// ── addMember validation ──

void describe("GroupsController — addMember validation", () => {
  const controller = new GroupsController(stubService(), stubMembersService());
  const req = makeReq();

  void test("throws UnauthorizedException without context", async () => {
    await assert.rejects(
      () => controller.addMember({} as never, GROUP_ID, { userId: USER_ID }),
      UnauthorizedException,
    );
  });

  void test("rejects missing userId", async () => {
    await assert.rejects(
      () => controller.addMember(req as never, GROUP_ID, {}),
      BadRequestException,
    );
  });

  void test("rejects empty userId", async () => {
    await assert.rejects(
      () => controller.addMember(req as never, GROUP_ID, { userId: "" }),
      BadRequestException,
    );
  });

  void test("rejects non-string userId", async () => {
    await assert.rejects(
      () => controller.addMember(req as never, GROUP_ID, { userId: 123 }),
      BadRequestException,
    );
  });
});

// ── addMember happy path ──

void describe("GroupsController — addMember happy path", () => {
  const req = makeReq();
  const STUB_MEMBER = {
    id: "m1",
    userId: USER_ID,
    isPrimaryGroup: true,
    activeFlag: true,
    joinedAt: "2026-01-01T00:00:00.000Z",
    userName: "田中",
    userEmail: "tanaka@e.com",
    userRole: "staff",
  };

  void test("forwards userId and isPrimary=true to service", async () => {
    let capturedGroupId: unknown;
    let capturedInput: unknown;
    const membersService = stubMembersService({
      addGroupMember: (_ctx: unknown, groupId: unknown, input: unknown) => {
        capturedGroupId = groupId;
        capturedInput = input;
        return Promise.resolve(STUB_MEMBER);
      },
    });
    const ctrl = new GroupsController(stubService(), membersService);
    const result = await ctrl.addMember(req as never, GROUP_ID, {
      userId: USER_ID,
      isPrimary: true,
    });
    assert.equal(capturedGroupId, GROUP_ID);
    assert.deepEqual(capturedInput, { userId: USER_ID, isPrimary: true });
    assert.equal(result.id, "m1");
  });

  void test("isPrimary defaults to false for non-boolean values", async () => {
    let capturedInput: unknown;
    const membersService = stubMembersService({
      addGroupMember: (_ctx: unknown, _groupId: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_MEMBER);
      },
    });
    const ctrl = new GroupsController(stubService(), membersService);
    await ctrl.addMember(req as never, GROUP_ID, {
      userId: USER_ID,
      isPrimary: "yes",
    });
    const input = capturedInput as { isPrimary: boolean };
    assert.equal(input.isPrimary, false);
  });
});

// ── removeMember ──

void describe("GroupsController — removeMember", () => {
  const req = makeReq();

  void test("throws UnauthorizedException without context", async () => {
    const controller = new GroupsController(
      stubService(),
      stubMembersService(),
    );
    await assert.rejects(
      () => controller.removeMember({} as never, GROUP_ID, USER_ID),
      UnauthorizedException,
    );
  });

  void test("calls service and returns ok", async () => {
    let capturedGroupId: unknown;
    let capturedUserId: unknown;
    const membersService = stubMembersService({
      removeGroupMember: (_ctx: unknown, groupId: unknown, userId: unknown) => {
        capturedGroupId = groupId;
        capturedUserId = userId;
        return Promise.resolve();
      },
    });
    const ctrl = new GroupsController(stubService(), membersService);
    const result = await ctrl.removeMember(req as never, GROUP_ID, USER_ID);
    assert.equal(capturedGroupId, GROUP_ID);
    assert.equal(capturedUserId, USER_ID);
    assert.deepEqual(result, { ok: true });
  });
});
