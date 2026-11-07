import { registerHooks } from 'node:module';
import path from 'node:path';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL || '';
    const fromAppTs = parent.includes('/src/') && parent.endsWith('.ts');
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    if (fromAppTs && isRelative && !path.extname(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
