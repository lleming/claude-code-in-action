import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../chat/ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

describe("ToolInvocationBadge", () => {
  describe("str_replace_editor", () => {
    it("shows Created with filename for create command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "src/components/Card.tsx" }}
          state="result"
        />
      );
      expect(screen.getByText("Created Card.tsx")).toBeDefined();
    });

    it("shows Updated with filename for str_replace command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "str_replace", path: "src/components/Button.tsx" }}
          state="result"
        />
      );
      expect(screen.getByText("Updated Button.tsx")).toBeDefined();
    });

    it("shows Updated with filename for insert command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "insert", path: "src/utils.ts" }}
          state="result"
        />
      );
      expect(screen.getByText("Updated utils.ts")).toBeDefined();
    });
  });

  describe("file_manager", () => {
    it("shows Deleted with filename for delete command", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          args={{ command: "delete", path: "src/old/OldComponent.tsx" }}
          state="result"
        />
      );
      expect(screen.getByText("Deleted OldComponent.tsx")).toBeDefined();
    });

    it("shows Renamed with old and new filename for rename command", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          args={{ command: "rename", path: "src/Foo.tsx", new_path: "src/Bar.tsx" }}
          state="result"
        />
      );
      expect(screen.getByText("Renamed Foo.tsx → Bar.tsx")).toBeDefined();
    });
  });

  describe("state indicator", () => {
    it("shows spinner while in progress", () => {
      const { container } = render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "src/Card.tsx" }}
          state="call"
        />
      );
      expect(container.querySelector(".animate-spin")).not.toBeNull();
    });

    it("shows green dot when done", () => {
      const { container } = render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "src/Card.tsx" }}
          state="result"
        />
      );
      expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
      expect(container.querySelector(".animate-spin")).toBeNull();
    });
  });
});
