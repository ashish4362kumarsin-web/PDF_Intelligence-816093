import fs from 'node:fs';
import path from 'node:path';

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  if (trimmed.length === 0) return true;
  return (
    /YOUR_/i.test(trimmed) ||
    /YOUR-/i.test(trimmed) ||
    /YOUR_PROJECT/i.test(trimmed) ||
    /YOUR_PRIVATE_KEY/i.test(trimmed) ||
    /CHANGE_ME/i.test(trimmed) ||
    trimmed === 'G-XXXXXXXXXX'
  );
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};

  const lines = content.split('\n');
  let currentKey = '';
  let currentValue = '';
  let inQuotes = false;

  for (const line of lines) {
    if (!inQuotes) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;

      currentKey = line.substring(0, eqIdx).trim();
      let rawVal = line.substring(eqIdx + 1);

      if (rawVal.startsWith('"') && !rawVal.endsWith('"')) {
        inQuotes = true;
        currentValue = rawVal.substring(1) + '\n';
      } else if (rawVal.startsWith("'") && !rawVal.endsWith("'")) {
        inQuotes = true;
        currentValue = rawVal.substring(1) + '\n';
      } else {
        result[currentKey] = rawVal.trim().replace(/^["']|["']$/g, '');
      }
    } else {
      if (line.endsWith('"') || line.endsWith("'")) {
        currentValue += line.slice(0, -1);
        result[currentKey] = currentValue;
        inQuotes = false;
        currentKey = '';
        currentValue = '';
      } else {
        currentValue += line + '\n';
      }
    }
  }

  return result;
}

export function loadAndNormalizeEnv(rootDir: string = process.cwd()): Record<string, string> {
  const exampleEnvPath = path.resolve(rootDir, '.env.example');
  const localEnvPath = path.resolve(rootDir, '.env.local');
  const standardEnvPath = path.resolve(rootDir, '.env');

  const fileVars = {
    ...parseEnvFile(exampleEnvPath),
    ...parseEnvFile(standardEnvPath),
    ...parseEnvFile(localEnvPath)
  };

  // Merge into process.env, overriding placeholders
  for (const [key, val] of Object.entries(fileVars)) {
    const currentVal = process.env[key];
    if (!currentVal || isPlaceholder(currentVal)) {
      process.env[key] = val;
    }
  }

  // Sanitize VITE_API_BASE_URL if pointing to localhost:8000 (an internal port that causes Failed to fetch in browsers)
  if (process.env.VITE_API_BASE_URL && process.env.VITE_API_BASE_URL.includes('localhost:8000')) {
    process.env.VITE_API_BASE_URL = '/api';
  }

  return fileVars;
}
