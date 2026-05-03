import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock("jose", () => {
  const mockBuilder = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  };
  return {
    SignJWT: vi.fn(() => mockBuilder),
    jwtVerify: vi.fn(),
  };
});

import { createSession } from "../auth";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createSession", () => {
  it("sets the auth-token cookie", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    expect(mockCookieStore.set.mock.calls[0][0]).toBe("auth-token");
  });

  it("sets httpOnly, sameSite, and path cookie options", async () => {
    await createSession("user-1", "user@example.com");

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("sets secure: false outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await createSession("user-1", "user@example.com");

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.secure).toBe(false);
  });

  it("sets secure: true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await createSession("user-1", "user@example.com");

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.secure).toBe(true);
  });
});
