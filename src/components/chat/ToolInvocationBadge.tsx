"use client";

import { FilePlus2, FilePen, Trash2, ArrowRight, Loader2 } from "lucide-react";

interface StrReplaceArgs {
  command: "create" | "str_replace" | "insert" | "view" | "undo_edit";
  path: string;
  new_path?: string;
}

interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

type ToolArgs = StrReplaceArgs | FileManagerArgs | Record<string, unknown>;

function filename(path: unknown): string {
  return typeof path === "string" ? path.split("/").pop() ?? path : "";
}

function getLabel(
  toolName: string,
  args: ToolArgs
): { icon: React.ReactNode; text: string } {
  if (toolName === "str_replace_editor") {
    const { command, path } = args as StrReplaceArgs;
    const name = filename(path);
    if (command === "create") {
      return { icon: <FilePlus2 className="w-3.5 h-3.5" />, text: `Created ${name}` };
    }
    if (command === "str_replace" || command === "insert") {
      return { icon: <FilePen className="w-3.5 h-3.5" />, text: `Updated ${name}` };
    }
  }

  if (toolName === "file_manager") {
    const { command, path, new_path } = args as FileManagerArgs;
    if (command === "delete") {
      return { icon: <Trash2 className="w-3.5 h-3.5" />, text: `Deleted ${filename(path)}` };
    }
    if (command === "rename") {
      return {
        icon: <ArrowRight className="w-3.5 h-3.5" />,
        text: `Renamed ${filename(path)} → ${filename(new_path)}`,
      };
    }
  }

  return { icon: <FilePen className="w-3.5 h-3.5" />, text: filename((args as StrReplaceArgs).path) || toolName };
}

interface ToolInvocationBadgeProps {
  toolName: string;
  args: ToolArgs;
  state: "call" | "partial-call" | "result";
}

export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const done = state === "result";
  const { icon, text } = getLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <span className="text-neutral-500 flex-shrink-0">{icon}</span>
      <span className="text-neutral-700">{text}</span>
    </div>
  );
}
