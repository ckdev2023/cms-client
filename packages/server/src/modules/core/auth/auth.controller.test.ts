import test from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import type { AuthService } from "./auth.service";

const validInput = ["Password", "123!"].join("");

void test("AuthController.login delegates to AuthService", async () => {
  let calledWith: { email: string; password: string } | undefined;
  const service = {
    login: (input: { email: string; password: string }) => {
      calledWith = input;
      return Promise.resolve({
        token: "token-1",
        user: {
          id: "user-1",
          orgId: "org-1",
          name: "Admin",
          email: "admin@example.com",
          role: "manager" as const,
        },
      });
    },
  } as unknown as AuthService;

  const controller = new AuthController(service);
  const result = await controller.login({
    email: "admin@example.com",
    password: validInput,
  });

  assert.deepEqual(calledWith, {
    email: "admin@example.com",
    password: validInput,
  });
  assert.equal(result.token, "token-1");
});

void test("AuthController.login validates request body", async () => {
  const service = {
    login: () => Promise.reject(new Error("should not be called")),
  } as unknown as AuthService;
  const controller = new AuthController(service);

  await assert.rejects(
    () => controller.login({ email: "", password: validInput }),
    BadRequestException,
  );
  await assert.rejects(
    () => controller.login({ email: "admin@example.com", password: null }),
    BadRequestException,
  );
});
