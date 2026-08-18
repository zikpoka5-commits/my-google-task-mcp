import { API_BASE_URL } from "../constants.js";

export class TasksApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TasksApiError";
  }
}

function getAccessToken(): string {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!token) {
    throw new TasksApiError(
      "GOOGLE_ACCESS_TOKEN environment variable is not set. Provide a valid OAuth access token with the https://www.googleapis.com/auth/tasks scope.",
    );
  }
  return token;
}

type QueryValue = string | number | boolean | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function makeApiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: unknown;
    query?: Record<string, QueryValue>;
  } = {},
): Promise<T> {
  const { method = "GET", body, query } = options;
  const token = getAccessToken();
  const url = buildUrl(path, query);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new TasksApiError("Request timed out after 30 seconds. Please try again.");
    }
    throw new TasksApiError(
      `Network error while calling Google Tasks API: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    let details = "";
    try {
      const errorBody = (await response.json()) as { error?: { message?: string } };
      details = errorBody.error?.message ?? "";
    } catch {
      // Response body was not JSON; ignore.
    }
    throw new TasksApiError(
      formatApiErrorMessage(response.status, details),
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function formatApiErrorMessage(status: number, details: string): string {
  switch (status) {
    case 400:
      return `Error: Invalid request${details ? ` - ${details}` : ""}. Check that IDs and field values (e.g. RFC 3339 timestamps for 'due') are formatted correctly.`;
    case 401:
      return "Error: Authentication failed. GOOGLE_ACCESS_TOKEN is missing, expired, or invalid. Get a new token from https://developers.google.com/oauthplayground (tokens expire after 1 hour).";
    case 403:
      return "Error: Permission denied. Ensure the access token was authorized with the https://www.googleapis.com/auth/tasks scope.";
    case 404:
      return `Error: Resource not found${details ? ` - ${details}` : ""}. Check that the tasklist_id or task ID is correct.`;
    case 429:
      return "Error: Rate limit exceeded. Please wait before making more requests.";
    default:
      return `Error: Google Tasks API request failed with status ${status}${details ? ` - ${details}` : ""}.`;
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof TasksApiError) {
    return error.message;
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}
