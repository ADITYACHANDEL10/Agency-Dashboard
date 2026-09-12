import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { Role, TaskStatus } from '@prisma/client';
import { getOnlineCount } from '../services/socket';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;

    if (user.role === Role.ADMIN) {
      const [totalProjects, tasksByStatus, overdueCount] = await Promise.all([
        prisma.project.count(),
        prisma.task.groupBy({ by: ['status'], _count: true }),
        prisma.task.count({ where: { status: TaskStatus.OVERDUE } }),
      ]);

      const statusMap: Record<string, number> = {};
      for (const s of tasksByStatus) {
        statusMap[s.status] = s._count;
      }

      return res.json({
        success: true,
        data: {
          role: 'ADMIN',
          totalProjects,
          tasksByStatus: statusMap,
          overdueCount,
          onlineUsers: getOnlineCount(),
        },
      });
    }

    if (user.role === Role.PROJECT_MANAGER) {
      const projects = await prisma.project.findMany({
        where: { createdById: user.userId },
        include: {
          _count: { select: { tasks: true } },
          tasks: {
            select: { priority: true, dueDate: true, status: true },
          },
        },
      });

      const tasksByPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      const upcoming: any[] = [];
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      for (const p of projects) {
        for (const t of p.tasks) {
          tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1;
          if (t.dueDate && t.dueDate <= weekFromNow && t.status !== TaskStatus.DONE) {
            upcoming.push({ projectTitle: p.title, dueDate: t.dueDate, status: t.status });
          }
        }
      }

      return res.json({
        success: true,
        data: {
          role: 'PROJECT_MANAGER',
          projectCount: projects.length,
          projects: projects.map((p) => ({
            id: p.id,
            title: p.title,
            taskCount: p._count.tasks,
          })),
          tasksByPriority,
          upcomingDueThisWeek: upcoming.sort(
            (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          ),
        },
      });
    }

    // Developer
    const tasks = await prisma.task.findMany({
      where: { assigneeId: user.userId },
      include: {
        project: { select: { id: true, title: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    res.json({
      success: true,
      data: {
        role: 'DEVELOPER',
        assignedTasks: tasks,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
