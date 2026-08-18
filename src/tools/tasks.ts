import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AddTaskInputSchema, ListTasksInputSchema } from "../schemas/tasks.js";
import { handleApiError, makeApiRequest } from "../services/tasksApi.js";
import { withCharacterLimit } from "../services/format.js";
import type { Task, TasksResponse } from "../types.js";

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    "add_task",
    {
      title: "Add Task",
      description: `Add a new task to a Google Tasks task list.

Args:
  - tasklist_id (string, required): ID of the task list to add the task to (from list_tasklists)
  - title (string, required): Title of the task (1-1024 characters)
  - notes (string, optional): Free-text notes/description for the task (max 8192 characters)
  - due (string, optional): Due date as an RFC 3339 timestamp, e.g. "2026-08-20T00:00:00Z".
    Only the date portion is stored; time-of-day is discarded by the API.
  - parent_task_id (string, optional): ID of an existing task in the same list. When given,
    the new task is created as a SUBTASK nested under that task instead of a top-level task.

Returns:
  The created task: { id, title, notes, due, status, parent }

Examples:
  - Use when: "이번 주 할일에 내일 병원 예약 넣어줘" -> tasklist_id=<found via list_tasklists>, title="병원 예약", due=<tomorrow, RFC 3339>
  - Use when: "'장보기' 할일 밑에 '우유 사기' 추가해줘" -> parent_task_id=<id of '장보기' task>, title="우유 사기"
  - Don't use when: you want to create a new task list (use create_tasklist instead)

Error Handling:
  - Returns "Error: Resource not found" if tasklist_id or parent_task_id does not exist
  - Returns "Error: Invalid request" if 'due' is not a valid RFC 3339 timestamp`,
      inputSchema: AddTaskInputSchema,
      annotations: {
        title: "Add Task",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ tasklist_id, title, notes, due, parent_task_id }) => {
      try {
        const created = await makeApiRequest<Task>(`/lists/${encodeURIComponent(tasklist_id)}/tasks`, {
          method: "POST",
          query: { parent: parent_task_id },
          body: {
            title,
            ...(notes !== undefined ? { notes } : {}),
            ...(due !== undefined ? { due } : {}),
          },
        });

        const output = {
          id: created.id,
          title: created.title,
          notes: created.notes,
          due: created.due,
          status: created.status,
          parent: created.parent,
        };

        const parentNote = created.parent ? ` as a subtask of ${created.parent}` : "";
        return {
          content: [
            {
              type: "text",
              text: `Added task "${created.title}" (id: ${created.id}) to list ${tasklist_id}${parentNote}.`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    },
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description: `List tasks inside a Google Tasks task list, with optional filters.

Args:
  - tasklist_id (string, required): ID of the task list to read tasks from (from list_tasklists)
  - due_min (string, optional): Only return tasks due on/after this RFC 3339 timestamp
  - due_max (string, optional): Only return tasks due on/before this RFC 3339 timestamp
  - show_completed (boolean, optional): Include completed tasks (default: true)

Returns:
  {
    "count": number,
    "items": [
      { "id": string, "title": string, "notes": string, "due": string,
        "status": "needsAction" | "completed", "parent": string }
    ],
    "truncated": boolean
  }

Examples:
  - Use when: "이번 주 할일 목록 보여줘" -> tasklist_id=<id>, due_min=<start of week>, due_max=<end of week>
  - Use when: "아직 안 끝난 할일만 보여줘" -> tasklist_id=<id>, show_completed=false
  - Don't use when: you want to see the task lists themselves (use list_tasklists instead)`,
      inputSchema: ListTasksInputSchema,
      annotations: {
        title: "List Tasks",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ tasklist_id, due_min, due_max, show_completed }) => {
      try {
        const data = await makeApiRequest<TasksResponse>(`/lists/${encodeURIComponent(tasklist_id)}/tasks`, {
          query: {
            dueMin: due_min,
            dueMax: due_max,
            showCompleted: show_completed,
            maxResults: 100,
          },
        });

        const items = (data.items ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          notes: task.notes,
          due: task.due,
          status: task.status,
          parent: task.parent,
        }));

        if (items.length === 0) {
          return {
            content: [{ type: "text", text: `No tasks found in list ${tasklist_id} matching the given filters.` }],
            structuredContent: { count: 0, items: [], truncated: false },
          };
        }

        const output = withCharacterLimit({ count: items.length, items, truncated: false });

        const lines = [`Found ${output.items.length} task(s) in list ${tasklist_id}:`, ""];
        for (const task of output.items) {
          const statusMark = task.status === "completed" ? "[x]" : "[ ]";
          const dueNote = task.due ? ` (due: ${task.due})` : "";
          const subtaskNote = task.parent ? ` (subtask of ${task.parent})` : "";
          lines.push(`- ${statusMark} ${task.title}${dueNote}${subtaskNote} — id: ${task.id}`);
        }
        if (output.truncated) {
          lines.push("", "Note: results were truncated due to size. Narrow the due_min/due_max range to see more.");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: output,
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    },
  );
}
