import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, pmOrAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';
import { AppError, errorCodes } from '../utils/errors';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { emitToProject, emitToUser } from '../services/socket';
import { getIO } from '../services/io';

const router = Router();
router.use(authenticate);

const statusValues = Object.values(TaskStatus) as [string, ...string[]];
const priorityValues = Object.values(Priority) as [string, ...string[]];

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(priorityValues as any).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(statusValues as any),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(priorityValues as any).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(statusValues as any).optional(),
});

// List tasks with filters (shareable query params)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const { status, priority, from, to, projectId } = req.query;

    let where: any = {};

    if (user.role === Role.DEVELOPER) {
      where.assigneeId = user.userId;
    } else if (user.role === Role.PROJECT_MANAGER) {
      where.project = { createdById: user.userId };
    }
    // Admin: no extra filter

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (from || to) {
      where.dueDate = {};
      if (from) where.dueDate.gte = new Date(from as string);
      if (to) where.dueDate.lte = new Date(to as string);
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, title: true, createdById: true } },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!task) throw new AppError('Task not found', 404, errorCodes.NOT_FOUND);

    if (user.role === Role.DEVELOPER && task.assigneeId !== user.userId) {
      throw new AppError('You cannot access this task', 403, errorCodes.FORBIDDEN);
    }
    if (user.role === Role.PROJECT_MANAGER && task.project.createdById !== user.userId) {
      throw new AppError('You cannot access this task', 403, errorCodes.FORBIDDEN);
    }

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

router.post('/', pmOrAdmin, async (req: AuthRequest, res, next) => {
  try {
    const body = createTaskSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: body.projectId } });
    if (!project) throw new AppError('Project not found', 404, errorCodes.NOT_FOUND);

    if (req.user!.role === Role.PROJECT_MANAGER && project.createdById !== req.user!.userId) {
      throw new AppError('You can only add tasks to your own projects', 403, errorCodes.FORBIDDEN);
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        projectId: body.projectId,
        assigneeId: body.assigneeId || null,
        priority: body.priority as Priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: TaskStatus.TODO,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
    });

    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        changedById: req.user!.userId,
        note: 'Task created',
      },
    });

    const activity = await prisma.activityLog.create({
      data: {
        type: 'TASK_CREATED',
        message: `${req.user!.email} created task "${task.title}"`,
        userId: req.user!.userId,
        projectId: task.projectId,
        taskId: task.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    if (task.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          title: 'New task assigned',
          message: `You were assigned to "${task.title}"`,
          type: 'TASK_ASSIGNED',
          relatedId: task.id,
        },
      });
      emitToUser(getIO(), task.assigneeId, 'notification:new', { unreadDelta: 1 });
    }

    emitToProject(getIO(), task.projectId, 'activity:new', activity);
    emitToProject(getIO(), task.projectId, 'task:created', task);

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// Update status — core real-time path
router.patch('/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const user = req.user!;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, createdById: true, title: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    if (!task) throw new AppError('Task not found', 404, errorCodes.NOT_FOUND);

    // Permission
    if (user.role === Role.DEVELOPER) {
      if (task.assigneeId !== user.userId) {
        throw new AppError('You can only update your own tasks', 403, errorCodes.FORBIDDEN);
      }
    } else if (user.role === Role.PROJECT_MANAGER) {
      if (task.project.createdById !== user.userId) {
        throw new AppError('You can only update tasks in your projects', 403, errorCodes.FORBIDDEN);
      }
    }

    const fromStatus = task.status;
    if (fromStatus === status) {
      return res.json({ success: true, data: task });
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: status as TaskStatus },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
    });

    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus,
        toStatus: status as TaskStatus,
        changedById: user.userId,
      },
    });

    const statusLabel = (s: string) =>
      s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const changer = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } });

    const activity = await prisma.activityLog.create({
      data: {
        type: 'STATUS_CHANGE',
        message: `${changer?.name || 'Someone'} moved Task "${task.title}" from ${statusLabel(fromStatus)} → ${statusLabel(status)}`,
        userId: user.userId,
        projectId: task.projectId,
        taskId: task.id,
        metadata: { fromStatus, toStatus: status },
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Notify PM when moved to In Review
    if (status === TaskStatus.IN_REVIEW && task.project.createdById !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: task.project.createdById,
          title: 'Task ready for review',
          message: `${changer?.name} moved "${task.title}" to In Review`,
          type: 'STATUS_CHANGE',
          relatedId: task.id,
        },
      });
      emitToUser(getIO(), task.project.createdById, 'notification:new', { unreadDelta: 1 });
    }

    emitToProject(getIO(), task.projectId, 'activity:new', activity);
    emitToProject(getIO(), task.projectId, 'task:updated', updated);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', pmOrAdmin, async (req: AuthRequest, res, next) => {
  try {
    const body = updateTaskSchema.parse(req.body);
    const user = req.user!;

    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!existing) throw new AppError('Task not found', 404, errorCodes.NOT_FOUND);

    if (user.role === Role.PROJECT_MANAGER && existing.project.createdById !== user.userId) {
      throw new AppError('Forbidden', 403, errorCodes.FORBIDDEN);
    }

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (body.status !== undefined) data.status = body.status;

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data,
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
    });

    if (body.assigneeId && body.assigneeId !== existing.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: body.assigneeId,
          title: 'New task assigned',
          message: `You were assigned to "${updated.title}"`,
          type: 'TASK_ASSIGNED',
          relatedId: updated.id,
        },
      });
      emitToUser(getIO(), body.assigneeId, 'notification:new', { unreadDelta: 1 });
    }

    emitToProject(getIO(), updated.projectId, 'task:updated', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
