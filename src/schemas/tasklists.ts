import { z } from "zod";

export const CreateTasklistInputSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(1024, "Title must not exceed 1024 characters")
      .describe("Title for the new task list, e.g. 'Groceries' or '이번 주 할일'"),
  })
  .strict();

export type CreateTasklistInput = z.infer<typeof CreateTasklistInputSchema>;

export const ListTasklistsInputSchema = z.object({}).strict();

export type ListTasklistsInput = z.infer<typeof ListTasklistsInputSchema>;
