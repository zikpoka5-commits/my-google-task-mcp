import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreateTasklistInputSchema, ListTasklistsInputSchema } from "../schemas/tasklists.js";
import { handleApiError, makeApiRequest } from "../services/tasksApi.js";
import { withCharacterLimit } from "../services/format.js";
import type { TaskList, TaskListsResponse } from "../types.js";

export function registerTasklistTools(server: McpServer): void {
  server.registerTool(
    "create_tasklist",
    {
      title: "Create Task List",
      description: `Create a new Google Tasks task list for the current user.

Args:
  - title (string, required): Title for the new task list (1-1024 characters)

Returns:
  The created task list: { id, title, updated, selfLink }

Use the returned 'id' as the tasklist_id argument for add_task and list_tasks.

Examples:
  - Use when: "새 할일 목록 '이번 주' 만들어줘" -> title="이번 주"
  - Don't use when: you just want to see existing lists (use list_tasklists instead)`,
      inputSchema: CreateTasklistInputSchema,
      annotations: {
        title: "Create Task List",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title }) => {
      try {
        const created = await makeApiRequest<TaskList>("/users/@me/lists", {
          method: "POST",
          body: { title },
        });

        const output = {
          id: created.id,
          title: created.title,
          updated: created.updated,
          selfLink: created.selfLink,
        };

        return {
          content: [
            {
              type: "text",
              text: `Created task list "${created.title}" (id: ${created.id})`,
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
    "list_tasklists",
    {
      title: "List Task Lists",
      description: `List all of the current user's Google Tasks task lists.

Args:
  None

Returns:
  {
    "count": number,        // number of task lists returned
    "items": [
      { "id": string, "title": string, "updated": string }
    ],
    "truncated": boolean    // true if results were cut short due to size
  }

Use the returned 'id' values as the tasklist_id argument for add_task and list_tasks.

Examples:
  - Use when: "내 할일 목록들 보여줘" -> call with no arguments
  - Don't use when: you want the tasks inside a list (use list_tasks instead)`,
      inputSchema: ListTasklistsInputSchema,
      annotations: {
        title: "List Task Lists",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const data = await makeApiRequest<TaskListsResponse>("/users/@me/lists", {
          query: { maxResults: 1000 },
        });

        const items = (data.items ?? []).map((list) => ({
          id: list.id,
          title: list.title,
          updated: list.updated,
        }));

        if (items.length === 0) {
          return {
            content: [{ type: "text", text: "No task lists found." }],
            structuredContent: { count: 0, items: [], truncated: false },
          };
        }

        const output = withCharacterLimit({ count: items.length, items, truncated: false });

        const lines = [`Found ${output.items.length} task list(s):`, ""];
        for (const list of output.items) {
          lines.push(`- ${list.title} (id: ${list.id})`);
        }
        if (output.truncated) {
          lines.push("", "Note: results were truncated due to size.");
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
