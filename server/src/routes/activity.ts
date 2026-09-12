import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Last 20 activity events the user is allowed to see (for offline catch-up)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    let where: any = {};

    if (user.role === Role.ADMIN) {
      // all
    } else if (user.role === Role.PROJECT_MANAGER) {
      where.project = { createdById: user.userId };
    } else {
      // Developer: only activity on tasks assigned to them
      where.task = { assigneeId: user.userId };
    }

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
});

export default router;
