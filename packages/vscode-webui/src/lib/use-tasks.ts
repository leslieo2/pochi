import { vscodeHost } from "@/lib/vscode";
import { getLogger } from "@getpochi/common";
import { catalog } from "@getpochi/livekit";
import { Schema } from "@livestore/livestore";
import { computed } from "@preact/signals-core";
import { threadSignal } from "@quilted/threads/signals";
import { useQuery } from "@tanstack/react-query";

const logger = getLogger("useTasks");

/** @useSignals */
export const useTasks = () => {
  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: readTasks,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return data?.value || [];
};

async function readTasks() {
  const tasks = threadSignal(await vscodeHost.readTasks());
  const decodeTaskRow = Schema.decodeUnknownSync(catalog.tables.tasks.rowSchema);
  return computed(() => {
    return Object.values(tasks.value).flatMap((value) => {
      try {
        return [decodeTaskRow(normalizeTaskRow(value))];
      } catch (error) {
        logger.warn("Failed to decode task row", error);
        return [];
      }
    });
  });
}

function normalizeTaskRow(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return {
    ...record,
    runAsync: normalizeBoolean(record.runAsync, 0),
    isPublicShared: normalizeBoolean(record.isPublicShared, 0),
    createdAt: normalizeDate(record.createdAt),
    updatedAt: normalizeDate(record.updatedAt),
  };
}

function normalizeBoolean(value: unknown, fallback: number) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return value;
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }
  return value;
}
