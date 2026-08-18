import { z } from "zod";

const rfc3339 = () =>
  z.string().datetime({
    offset: true,
    message: "Must be an RFC 3339 timestamp, e.g. '2026-08-20T00:00:00Z'",
  });

export const AddTaskInputSchema = z
  .object({
    tasklist_id: z
      .string()
      .min(1, "tasklist_id is required")
      .describe("ID of the task list to add the task to. Obtain this from list_tasklists."),
    title: z
      .string()
      .min(1, "Title is required")
      .max(1024, "Title must not exceed 1024 characters")
      .describe("Title of the task"),
    notes: z
      .string()
      .max(8192, "Notes must not exceed 8192 characters")
      .optional()
      .describe("Optional free-text notes/description for the task"),
    due: rfc3339()
      .optional()
      .describe(
        "Optional due date as an RFC 3339 timestamp, e.g. '2026-08-20T00:00:00Z'. " +
          "The Google Tasks API only stores the date portion; any time-of-day is discarded.",
      ),
    parent_task_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional ID of an existing task in the same list. When provided, the new task " +
          "is created as a subtask nested under that task.",
      ),
  })
  .strict();

export type AddTaskInput = z.infer<typeof AddTaskInputSchema>;

export const ListTasksInputSchema = z
  .object({
    tasklist_id: z
      .string()
      .min(1, "tasklist_id is required")
      .describe("ID of the task list to read tasks from. Obtain this from list_tasklists."),
    due_min: rfc3339()
      .optional()
      .describe("Only return tasks due on or after this RFC 3339 timestamp"),
    due_max: rfc3339()
      .optional()
      .describe("Only return tasks due on or before this RFC 3339 timestamp"),
    show_completed: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to include completed tasks in the results (default: true)"),
  })
  .strict();

export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;
