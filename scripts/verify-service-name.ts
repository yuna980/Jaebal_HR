import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const serviceName = '야구없인못살아';
const previousNames = ['제발 홈런', '제발홈런', 'jaebal-hr', 'yagu-bollrae', '야구 볼래?'];
const requiredFiles = [
  'src/app/layout.tsx',
  'src/components/AuthForm.tsx',
];
const scanDirs = ['src', 'public'];
const ignoredDirs = new Set(['.next', 'node_modules']);

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (ignoredDirs.has(entry)) {
      return [];
    }

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return walkFiles(fullPath);
    }

    return stat.isFile() ? [fullPath] : [];
  });
}

const missingServiceName = requiredFiles.filter((file) => {
  const content = readFileSync(join(rootDir, file), 'utf8');
  return !content.includes(serviceName);
});

const staleMatches = scanDirs
  .flatMap((dir) => walkFiles(join(rootDir, dir)))
  .flatMap((file) => {
    const content = readFileSync(file, 'utf8');
    return previousNames
      .filter((name) => content.includes(name))
      .map((name) => `${file.replace(`${rootDir}/`, '')}: ${name}`);
  });

if (missingServiceName.length > 0 || staleMatches.length > 0) {
  console.error('Service name verification failed.');

  if (missingServiceName.length > 0) {
    console.error(`Missing "${serviceName}" in:`);
    missingServiceName.forEach((file) => console.error(`- ${file}`));
  }

  if (staleMatches.length > 0) {
    console.error('Stale service names found:');
    staleMatches.forEach((match) => console.error(`- ${match}`));
  }

  process.exit(1);
}

console.log(`Service name verification passed: ${serviceName}`);
