export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'OVERDUE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  createdById: string;
  client?: Client;
  createdBy?: { id: string; name: string };
  tasks?: Task[];
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  projectId: string;
  assigneeId?: string;
  assignee?: { id: string; name: string };
  project?: { id: string; title: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  type: string;
  message: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  createdAt: string;
  user?: { id: string; name: string };
  project?: { id: string; title: string };
  task?: { id: string; title: string };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}
