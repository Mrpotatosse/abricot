import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export const SRC = resolve(dirname(__filename));
export const ROOT = join(SRC, '..');
