import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { TaskStatus } from '@prisma/client';
import { Server } from 'socket.io';
import { emitToProject } from '../services/socket';

export function startOverdueJob(io: Server) {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Checking for overdue tasks...');
    try {
      const now = new Date();
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: [TaskStatus.DONE, TaskStatus.OVERDUE] },
        },
        include: {
          assignee: { select: { id: true, name: true } },
          project: { select: { id: true, title: true } },
        },
      });

      for (const task of overdueTasks) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.OVERDUE },
        });

        await prisma.taskStatusHistory.create({
          data: {
            taskId: task.id,
            fromStatus: task.status,
            toStatus: TaskStatus.OVERDUE,
            changedById: task.assigneeId || (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.id,
            note: 'Automatically marked overdue by system',
          },
        });

        const activity = await prisma.activityLog.create({
          data: {
            type: 'STATUS_CHANGE',
            message: `System marked Task "${task.title}" as Overdue`,
            userId: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.id,
            projectId: task.projectId,
            taskId: task.id,
          },
          include: {
            user: { select: { id: true, name: true } },
          },
        });

        emitToProject(io, task.projectId, 'activity:new', activity);
        emitToProject(io, task.projectId, 'task:updated', { id: task.id, status: TaskStatus.OVERDUE });
      }

      if (overdueTasks.length > 0) {
        console.log(`[cron] Marked ${overdueTasks.length} tasks as overdue`);
      }
    } catch (err) {
      console.error('[cron] Overdue job failed', err);
    }
  });

  console.log('[cron] Overdue task job scheduled (hourly)');
}
