import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_STORAGE_KEY,
  createAdminSessionController,
  type AdminSessionStorageLike,
} from "./adminSession";

function createStorage(
  seed?: Record<string, string>,
): AdminSessionStorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed ?? {}));

  return {
    data,
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
    removeItem(key: string): void {
      data.delete(key);
    },
  };
}

describe("createAdminSessionController", () => {
  it("starts unauthenticated when storage is empty", () => {
    const controller = createAdminSessionController();
    const storage = createStorage();

    controller.hydrate(storage);

    expect(controller.session.value).toBeNull();
    expect(controller.isAuthenticated.value).toBe(false);
  });

  it("hydrates an existing session from storage", () => {
    const controller = createAdminSessionController();
    const storage = createStorage({
      [ADMIN_SESSION_STORAGE_KEY]: JSON.stringify({
        user: {
          name: "Admin User",
          email: "admin@example.com",
          role: "管理员",
          initials: "AU",
        },
        loggedInAt: 1234,
      }),
    });

    controller.hydrate(storage);

    expect(controller.isAuthenticated.value).toBe(true);
    expect(controller.currentUser.value?.email).toBe("admin@example.com");
    expect(controller.currentUser.value?.initials).toBe("AU");
  });

  it("login normalizes email and persists the session", () => {
    const controller = createAdminSessionController({ now: () => 2048 });
    const storage = createStorage();

    const session = controller.login(
      { email: " Team.Admin@Example.com ", password: "secret" },
      storage,
    );

    expect(session.user.email).toBe("team.admin@example.com");
    expect(session.user.name).toBe("Team Admin");
    expect(session.user.initials).toBe("TA");
    expect(session.loggedInAt).toBe(2048);

    const raw = storage.getItem(ADMIN_SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(session);
  });

  it("logout clears the in-memory and persisted session", () => {
    const controller = createAdminSessionController({ now: () => 100 });
    const storage = createStorage();

    controller.login({ email: "admin@example.com", password: "pw" }, storage);
    controller.logout(storage);

    expect(controller.isAuthenticated.value).toBe(false);
    expect(controller.session.value).toBeNull();
    expect(storage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("treats corrupted storage as signed out", () => {
    const controller = createAdminSessionController();
    const storage = createStorage({
      [ADMIN_SESSION_STORAGE_KEY]: "{bad-json",
    });

    controller.hydrate(storage);

    expect(controller.session.value).toBeNull();
    expect(controller.isAuthenticated.value).toBe(false);
  });

  it("isAdmin returns true when user role is 管理员", () => {
    const controller = createAdminSessionController({ now: () => 100 });
    const storage = createStorage();

    controller.login({ email: "admin@example.com", password: "pw" }, storage);

    expect(controller.isAdmin.value).toBe(true);
  });

  it("isAdmin returns false when not authenticated", () => {
    const controller = createAdminSessionController();
    const storage = createStorage();

    controller.hydrate(storage);

    expect(controller.isAdmin.value).toBe(false);
  });

  it("isAdmin returns true for restored session with admin role", () => {
    const controller = createAdminSessionController();
    const storage = createStorage({
      [ADMIN_SESSION_STORAGE_KEY]: JSON.stringify({
        user: {
          name: "Admin",
          email: "admin@example.com",
          role: "管理员",
          initials: "AD",
        },
        loggedInAt: 1234,
      }),
    });

    controller.hydrate(storage);

    expect(controller.isAdmin.value).toBe(true);
  });

  it("isAdmin returns false for non-admin role", () => {
    const controller = createAdminSessionController();
    const storage = createStorage({
      [ADMIN_SESSION_STORAGE_KEY]: JSON.stringify({
        user: {
          name: "Staff",
          email: "staff@example.com",
          role: "主办人",
          initials: "ST",
        },
        loggedInAt: 1234,
      }),
    });

    controller.hydrate(storage);

    expect(controller.isAdmin.value).toBe(false);
  });
});
