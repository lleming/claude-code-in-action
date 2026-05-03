import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
});

describe("useAuth — initial state", () => {
  it("starts with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — signIn", () => {
  it("returns the result from signInAction", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returned: Awaited<ReturnType<typeof result.current.signIn>>;

    await act(async () => {
      returned = await result.current.signIn("user@example.com", "wrongpass");
    });

    expect(returned!).toEqual({ success: false, error: "Invalid credentials" });
  });

  it("sets isLoading to true while in flight and resets to false after", async () => {
    let resolveSignIn!: (v: { success: boolean }) => void;
    mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));
    mockGetProjects.mockResolvedValue([]);

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signIn("user@example.com", "password1");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("resets isLoading to false when signInAction rejects", async () => {
    mockSignIn.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password1").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("does not navigate when sign in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "badpass");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth — post sign-in routing", () => {
  it("migrates anonymous work: creates project and routes to it", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/": { type: "directory" } },
    });
    mockCreateProject.mockResolvedValue({ id: "anon-proj-1" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password1");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "hello" }],
        data: { "/": { type: "directory" } },
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj-1");
  });

  it("does not migrate anon work when anonWork is null", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([{ id: "existing-proj" } as any]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password1");
    });

    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });

  it("does not migrate anon work when messages array is empty", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "existing-proj" } as any]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password1");
    });

    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });

  it("routes to the most recent project when user has existing projects", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([
      { id: "recent-proj" } as any,
      { id: "older-proj" } as any,
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password1");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("creates a new project when user has no existing projects", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-proj-99" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password1");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/new-proj-99");
  });
});

describe("useAuth — signUp", () => {
  it("returns the result from signUpAction", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returned: Awaited<ReturnType<typeof result.current.signUp>>;

    await act(async () => {
      returned = await result.current.signUp("taken@example.com", "password1");
    });

    expect(returned!).toEqual({ success: false, error: "Email already registered" });
  });

  it("does not navigate when sign up fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("taken@example.com", "password1");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("migrates anonymous work after successful sign up", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "make me a button" }],
      fileSystemData: { "/": {}, "/App.tsx": {} },
    });
    mockCreateProject.mockResolvedValue({ id: "new-signup-proj" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password1");
    });

    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/new-signup-proj");
  });

  it("routes to existing project after successful sign up with no anon work", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([{ id: "user-proj" } as any]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password1");
    });

    expect(mockPush).toHaveBeenCalledWith("/user-proj");
  });

  it("sets isLoading to false after sign up regardless of outcome", async () => {
    mockSignUp.mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("user@example.com", "password1").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
