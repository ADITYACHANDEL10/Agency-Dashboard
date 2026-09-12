import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  // Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@agency.com',
      password,
      name: 'Sarah Chen',
      role: Role.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      email: 'pm1@agency.com',
      password,
      name: 'Ravi Patel',
      role: Role.PROJECT_MANAGER,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      email: 'pm2@agency.com',
      password,
      name: 'Elena Morales',
      role: Role.PROJECT_MANAGER,
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      email: 'dev1@agency.com',
      password,
      name: 'Alex Rivera',
      role: Role.DEVELOPER,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      email: 'dev2@agency.com',
      password,
      name: 'Jordan Lee',
      role: Role.DEVELOPER,
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      email: 'dev3@agency.com',
      password,
      name: 'Sam Okonkwo',
      role: Role.DEVELOPER,
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      email: 'dev4@agency.com',
      password,
      name: 'Mia Torres',
      role: Role.DEVELOPER,
    },
  });

  // Clients
  const client1 = await prisma.client.create({
    data: { name: 'Acme Corp', email: 'contact@acme.com', company: 'Acme Corporation' },
  });
  const client2 = await prisma.client.create({
    data: { name: 'BrightStart Labs', email: 'hello@brightstart.io', company: 'BrightStart Labs' },
  });
  const client3 = await prisma.client.create({
    data: { name: 'Nova Retail', email: 'ops@novaretail.com', company: 'Nova Retail Group' },
  });

  // Projects
  const project1 = await prisma.project.create({
    data: {
      title: 'Acme Website Redesign',
      description: 'Full redesign of the public marketing site and blog.',
      clientId: client1.id,
      createdById: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      title: 'BrightStart Mobile App',
      description: 'React Native app for customer onboarding and tracking.',
      clientId: client2.id,
      createdById: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      title: 'Nova Inventory Dashboard',
      description: 'Internal dashboard for inventory and order management.',
      clientId: client3.id,
      createdById: pm2.id,
    },
  });

  // Helper to create task + history + activity
  async function createTask(opts: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    dueDate?: Date;
    projectId: string;
    assigneeId?: string;
    changedById: string;
  }) {
    const task = await prisma.task.create({
      data: {
        title: opts.title,
        description: opts.description,
        status: opts.status,
        priority: opts.priority,
        dueDate: opts.dueDate,
        projectId: opts.projectId,
        assigneeId: opts.assigneeId,
      },
    });

    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: opts.status,
        changedById: opts.changedById,
        note: 'Initial status',
      },
    });

    return task;
  }

  // Project 1 tasks (PM1)
  const t1 = await createTask({
    title: 'Homepage hero section',
    description: 'Implement new hero with animation and responsive breakpoints.',
    status: TaskStatus.DONE,
    priority: Priority.HIGH,
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    projectId: project1.id,
    assigneeId: dev1.id,
    changedById: pm1.id,
  });

  const t2 = await createTask({
    title: 'Blog listing page',
    description: 'Server-side rendered list with filters and pagination.',
    status: TaskStatus.IN_REVIEW,
    priority: Priority.MEDIUM,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    projectId: project1.id,
    assigneeId: dev2.id,
    changedById: pm1.id,
  });

  const t3 = await createTask({
    title: 'Contact form backend',
    description: 'API endpoint + spam protection + email notification.',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    projectId: project1.id,
    assigneeId: dev1.id,
    changedById: pm1.id,
  });

  const t4 = await createTask({
    title: 'SEO meta tags audit',
    description: 'Review and update all page meta, OG tags, sitemap.',
    status: TaskStatus.TODO,
    priority: Priority.LOW,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    projectId: project1.id,
    assigneeId: dev3.id,
    changedById: pm1.id,
  });

  const t5 = await createTask({
    title: 'Performance budget setup',
    description: 'Lighthouse CI + budget for LCP/CLS.',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    projectId: project1.id,
    assigneeId: dev2.id,
    changedById: pm1.id,
  });

  // Project 2 tasks
  const t6 = await createTask({
    title: 'Auth flow screens',
    description: 'Login, register, forgot password screens + navigation.',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.CRITICAL,
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    projectId: project2.id,
    assigneeId: dev3.id,
    changedById: pm1.id,
  });

  const t7 = await createTask({
    title: 'Push notification service',
    description: 'FCM setup and in-app notification center.',
    status: TaskStatus.TODO,
    priority: Priority.HIGH,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    projectId: project2.id,
    assigneeId: dev4.id,
    changedById: pm1.id,
  });

  const t8 = await createTask({
    title: 'Onboarding tutorial',
    description: 'Interactive walkthrough for first-time users.',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    projectId: project2.id,
    assigneeId: dev1.id,
    changedById: pm1.id,
  });

  const t9 = await createTask({
    title: 'API client layer',
    description: 'Typed API client with refresh token handling.',
    status: TaskStatus.IN_REVIEW,
    priority: Priority.HIGH,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // already past
    projectId: project2.id,
    assigneeId: dev2.id,
    changedById: pm1.id,
  });

  const t10 = await createTask({
    title: 'Offline cache strategy',
    description: 'Decide and implement offline-first data layer.',
    status: TaskStatus.TODO,
    priority: Priority.LOW,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    projectId: project2.id,
    assigneeId: dev4.id,
    changedById: pm1.id,
  });

  // Project 3 tasks (PM2)
  const t11 = await createTask({
    title: 'Inventory table component',
    description: 'Virtualized table with sorting, filters, bulk actions.',
    status: TaskStatus.DONE,
    priority: Priority.HIGH,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    projectId: project3.id,
    assigneeId: dev3.id,
    changedById: pm2.id,
  });

  const t12 = await createTask({
    title: 'Order status webhooks',
    description: 'Receive and process external order status updates.',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.CRITICAL,
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // overdue
    projectId: project3.id,
    assigneeId: dev4.id,
    changedById: pm2.id,
  });

  const t13 = await createTask({
    title: 'Role-based views',
    description: 'Different dashboards for warehouse vs admin users.',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    projectId: project3.id,
    assigneeId: dev1.id,
    changedById: pm2.id,
  });

  const t14 = await createTask({
    title: 'Export CSV / PDF',
    description: 'Bulk export of inventory and order reports.',
    status: TaskStatus.TODO,
    priority: Priority.LOW,
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    projectId: project3.id,
    assigneeId: dev2.id,
    changedById: pm2.id,
  });

  const t15 = await createTask({
    title: 'Dark mode theming',
    description: 'Full dark theme support across the dashboard.',
    status: TaskStatus.IN_REVIEW,
    priority: Priority.MEDIUM,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    projectId: project3.id,
    assigneeId: dev3.id,
    changedById: pm2.id,
  });

  // Force two tasks to OVERDUE status for seed realism (the cron will also catch them)
  await prisma.task.update({
    where: { id: t9.id },
    data: { status: TaskStatus.OVERDUE },
  });
  await prisma.taskStatusHistory.create({
    data: {
      taskId: t9.id,
      fromStatus: TaskStatus.IN_REVIEW,
      toStatus: TaskStatus.OVERDUE,
      changedById: admin.id,
      note: 'Marked overdue by system',
    },
  });

  await prisma.task.update({
    where: { id: t12.id },
    data: { status: TaskStatus.OVERDUE },
  });
  await prisma.taskStatusHistory.create({
    data: {
      taskId: t12.id,
      fromStatus: TaskStatus.IN_PROGRESS,
      toStatus: TaskStatus.OVERDUE,
      changedById: admin.id,
      note: 'Marked overdue by system',
    },
  });

  // Activity logs (pre-existing so feed is not empty)
  const activities = [
    {
      type: 'STATUS_CHANGE',
      message: 'Ravi Patel moved Task "Homepage hero section" from In Progress → Done',
      userId: pm1.id,
      projectId: project1.id,
      taskId: t1.id,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      type: 'STATUS_CHANGE',
      message: 'Alex Rivera moved Task "Contact form backend" from To Do → In Progress',
      userId: dev1.id,
      projectId: project1.id,
      taskId: t3.id,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      type: 'STATUS_CHANGE',
      message: 'Jordan Lee moved Task "Blog listing page" from In Progress → In Review',
      userId: dev2.id,
      projectId: project1.id,
      taskId: t2.id,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      type: 'ASSIGNED',
      message: 'Ravi Patel assigned Task "Auth flow screens" to Sam Okonkwo',
      userId: pm1.id,
      projectId: project2.id,
      taskId: t6.id,
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
    },
    {
      type: 'STATUS_CHANGE',
      message: 'Sam Okonkwo moved Task "Auth flow screens" from To Do → In Progress',
      userId: dev3.id,
      projectId: project2.id,
      taskId: t6.id,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      type: 'STATUS_CHANGE',
      message: 'Elena Morales moved Task "Inventory table component" from In Review → Done',
      userId: pm2.id,
      projectId: project3.id,
      taskId: t11.id,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      type: 'STATUS_CHANGE',
      message: 'Mia Torres moved Task "Order status webhooks" from To Do → In Progress',
      userId: dev4.id,
      projectId: project3.id,
      taskId: t12.id,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      type: 'STATUS_CHANGE',
      message: 'System marked Task "API client layer" as Overdue',
      userId: admin.id,
      projectId: project2.id,
      taskId: t9.id,
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  ];

  for (const a of activities) {
    await prisma.activityLog.create({ data: a });
  }

  // A couple of notifications
  await prisma.notification.create({
    data: {
      userId: dev1.id,
      title: 'New task assigned',
      message: 'You were assigned to "Contact form backend"',
      type: 'TASK_ASSIGNED',
      relatedId: t3.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: pm1.id,
      title: 'Task ready for review',
      message: 'Jordan Lee moved "Blog listing page" to In Review',
      type: 'STATUS_CHANGE',
      relatedId: t2.id,
    },
  });

  console.log('Seed complete.');
  console.log('Logins (password for all: password123):');
  console.log('  Admin: admin@agency.com');
  console.log('  PM1:   pm1@agency.com  (Ravi)');
  console.log('  PM2:   pm2@agency.com  (Elena)');
  console.log('  Devs:  dev1@agency.com … dev4@agency.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
