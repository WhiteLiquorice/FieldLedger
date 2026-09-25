import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dependencies = Object.keys(pkg.dependencies);
const result = await build({
  absWorkingDir: root, entryPoints: ['src/index.ts'], outfile: 'lib/deployment.cjs',
  bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: true, metafile: true,
  external: dependencies.flatMap(name => [name, `${name}/*`]),
  alias: { '@compliance-saas/backend-core': path.resolve(root, '../packages/backend-core/src/index.ts') },
});
const imports = Object.values(result.metafile.outputs).flatMap(output => output.imports).filter(item => item.external).map(item => item.path);
for (const specifier of imports) {
  if (specifier.startsWith('node:') || builtinModules.includes(specifier) || dependencies.some(name => specifier === name || specifier.startsWith(`${name}/`))) continue;
  throw new Error(`Undeclared runtime dependency in Functions bundle: ${specifier}`);
}
if (!Object.keys(result.metafile.inputs).some(file => file.includes('backend-core/src/'))) throw new Error('Shared backend was not included in the deployment bundle.');
fs.mkdirSync(path.resolve(root, '../.local'), { recursive: true });
fs.writeFileSync(path.resolve(root, '../.local/functions-bundle.json'), JSON.stringify(result.metafile, null, 2));
console.log(`Functions bundle includes backend-core; ${new Set(imports).size} external imports verified against runtime dependencies.`);
