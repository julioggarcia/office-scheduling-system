import { PrismaClient } from '@prisma/client';

declare global {
  // allow global prisma across hot-reloads in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const client = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = client;
export default client;
