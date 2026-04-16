import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_SESSION_STORAGE_KEY,
  adminSessionController,
  createAdminSessionController,
  type AdminSessionStorageLike,
  getAdminAccessToken,
  loginAdmin,
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
        token: "jwt-token",
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
    expect(controller.session.value?.token).toBe("jwt-token");
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
    expect(session.token).toBe("demo-token:team.admin@example.com");

    const raw = storage.getItem(ADMIN_SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(session);
  });

  it("loginFromResponse persists the backend token and role", () => {
    const controller = createAdminSessionController({ now: () => 4096 });
    const storage = createStorage();

    const session = controller.loginFromResponse(
      {
        token: "jwt-real-token",
        user: {
          id: "user-1",
          orgId: "org-1",
          name: "Ada Lovelace",
          email: " Ada@example.com ",
          role: "manager",
        },
      },
      storage,
    );

    expect(session.token).toBe("jwt-real-token");
    expect(session.user.email).toBe("ada@example.com");
    expect(session.user.name).toBe("Ada Lovelace");
    expect(session.user.initials).toBe("AL");
    expect(session.user.role).toBe("manager");
    expect(controller.isAdmin.value).toBe(true);
    expect(JSON.parse(storage.getItem(ADMIN_SESSION_STORAGE_KEY)!)).toEqual(
      session,
    );
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
        token: "jwt-token",
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
        token: "jwt-token",
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

  it("treats manager role from backend as admin", () => {
    const controller = createAdminSessionController({ now: () => 100 });
    const storage = createStorage();

    controller.loginFromResponse(
      {
        token: "jwt-token",
        user: {
          id: "user-1",
          orgId: "org-1",
          name: "Manager User",
          email: "manager@example.com",
          role: "manager",
        },
      },
      storage,
    );

    expect(controller.isAdmin.value).toBe(true);
  });

  it("loginAdmin posts to backend and persists the returned session", async () => {
    const controller = createAdminSessionController({ now: () => 5120 });
    const storage = createStorage();
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "jwt-from-api",
          user: {
            id: "user-1",
            orgId: "org-1",
            name: "Admin User",
            email: "admin@example.com",
            role: "manager",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const session = await loginAdmin(
      { email: "admin@example.com", password: "Password123!" },
      { controller, storage, request },
    );

    expect(request).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "admin@example.com",
          password: "Password123!",
        }),
      }),
    );
    expect(session.token).toBe("jwt-from-api");
    expect(controller.currentUser.value?.email).toBe("admin@example.com");
    expect(storage.getItem(ADMIN_SESSION_STORAGE_KEY)).toContain(
      "jwt-from-api",
    );
  });

  it("loginAdmin surfaces unauthorized errors without persisting a session", async () => {
    const controller = createAdminSessionController();
    const storage = createStorage();
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid email or password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      loginAdmin(
        { email: "admin@example.com", password: "wrong" },
        { controller, storage, request },
      ),
    ).rejects.toMatchObject({
      name: "AdminLoginRequestError",
      code: "UNAUTHORIZED",
      status: 401,
    });
    expect(controller.isAuthenticated.value).toBe(false);
    expect(storage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("getAdminAccessToken returns the persisted token in browser-like mode", () => {
    adminSessionController.reset();
    window.localStorage.setItem(
      ADMIN_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-browser",
        user: {
          name: "Admin",
          email: "admin@example.com",
          role: "manager",
          initials: "AD",
        },
        loggedInAt: 1234,
      }),
    );

    try {
      expect(getAdminAccessToken()).toBe("jwt-browser");
    } finally {
      window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      adminSessionController.reset();
    }
  });
});
