import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function typescriptFile(base) {
  if (existsSync(`${base}.ts`)) return `${base}.ts`;
  if (existsSync(`${base}.tsx`)) return `${base}.tsx`;
  if (existsSync(`${base}.js`)) return `${base}.js`;
  return '';
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const file = typescriptFile(join(root, 'src', specifier.slice(2)));
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]s$/.test(specifier) && !specifier.endsWith('.json')) {
      const parent = context.parentURL ? fileURLToPath(context.parentURL) : join(root, 'package.json');
      const file = typescriptFile(join(dirname(parent), specifier));
      if (file) return nextResolve(`${specifier}${file.slice(file.lastIndexOf('.'))}`, context);
    }
    return nextResolve(specifier, context);
  },
});
