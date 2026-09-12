import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, pmOrAdmin, adminOnly } from '../middleware/auth';
import { AuthRequest } from '../types';
import { AppError, errorCodes } from '../utils/errors';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  clientId: z.string().uuid(),
});

// List projects — role filtered
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    let where: any = {};

    if (user.role === Role.PROJECT_MANAGER) {
      where.createdById = user.userId;
    } else if (user.role === Role.DEVELOPER) {
      // Developers only see projects that have tasks assigned to them
      where.tasks = { some: { assigneeId: user.userId } };
    }
    // Admin sees all

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, company: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        },
      },
    });

    if (!project) throw new AppError('Project not found', 404, errorCodes.NOT_FOUND);

    // Permission checks
    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.userId) {
      throw new AppError('You cannot access this project', 403, errorCodes.FORBIDDEN);
    }
    if (user.role === Role.DEVELOPER) {
      const hasTask = project.tasks.some((t) => t.assigneeId === user.userId);
      if (!hasTask) {
        throw new AppError('You cannot access this project', 403, errorCodes.FORBIDDEN);
      }
      // Filter tasks to only assigned ones for developers
      project.tasks = project.tasks.filter((t) => t.assigneeId === user.userId);
    }

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

router.post('/', pmOrAdmin, async (req: AuthRequest, res, next) => {
  try {
    const body = createProjectSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: body.clientId } });
    if (!client) throw new AppError('Client not found', 404, errorCodes.NOT_FOUND);

    const project = await prisma.project.create({
      data: {
        title: body.title,
        description: body.description,
        clientId: body.clientId,
        createdById: req.user!.userId,
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// Clients list (for create form)
router.get('/meta/clients', pmOrAdmin, async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, company: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
});

export default router;
