export interface TaskList {
  kind: string;
  id: string;
  etag: string;
  title: string;
  updated: string;
  selfLink: string;
}

export interface TaskListsResponse {
  kind: string;
  etag?: string;
  nextPageToken?: string;
  items?: TaskList[];
}

export interface Task {
  kind: string;
  id: string;
  etag: string;
  title: string;
  updated: string;
  selfLink: string;
  parent?: string;
  position?: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
}

export interface TasksResponse {
  kind: string;
  etag?: string;
  nextPageToken?: string;
  items?: Task[];
}
