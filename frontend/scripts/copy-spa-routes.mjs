import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const routes = ['dashboard', 'upload', 'ready', 'admin', 'login', 'register'];
const distDir = join(process.cwd(), 'dist');
const indexPath = join(distDir, 'index.html');

await Promise.all(
  routes.map(async (route) => {
    const routeDir = join(distDir, route);
    await mkdir(routeDir, { recursive: true });
    await copyFile(indexPath, join(routeDir, 'index.html'));
  }),
);
