import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolvePreviews, assessVerification } from './contracts.mjs';

const exec = promisify(execFile);
const schemaRoot = fileURLToPath(new URL('../schemas/', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const requiredDocs = ['README.md', 'docs/ARCHITECTURE.md', 'docs/CUSTOMIZATION.md', 'docs/VERIFICATION.md', 'docs/LICENSE.md'];
const media = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'mp4', 'webm']);

// 校验器只读取自身携带的规范；模板提供的 Schema 用于编辑器提示，不作为信任根。
export function validate(value, schema, location = '$', root = schema, depth = 0) {
  if (depth > 100) throw new Error(`${location}: 嵌套过深`);
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/')) throw new Error('不支持外部 Schema 引用');
    const target = schema.$ref.slice(2).split('/').reduce((v, k) => v?.[k], root);
    if (!target) throw new Error('无效 Schema 引用');
    return validate(value, target, location, root, depth + 1);
  }
  const fail = message => { throw new Error(`${location}: ${message}`); };
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (schema.type && ![schema.type].flat().some(t => t === type || (t === 'integer' && Number.isInteger(value)))) fail('类型不正确');
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) fail('固定值不匹配');
  if (schema.enum && !schema.enum.includes(value)) fail('枚举值不支持');
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && [...value].length < schema.minLength) fail('字符串过短');
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) fail('字符串过长');
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) fail('字符串格式不正确');
  }
  if (typeof value === 'number' && ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum))) fail('数值越界');
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail('数组元素不足');
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) fail('数组含重复元素');
    if (schema.items) value.forEach((v, i) => validate(v, schema.items, `${location}[${i}]`, root, depth + 1));
  } else if (type === 'object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) fail(`缺少字段 ${key}`);
    for (const [key, child] of Object.entries(value)) {
      const property = schema.properties && Object.hasOwn(schema.properties, key) ? schema.properties[key] : undefined;
      if (property) validate(child, property, `${location}.${key}`, root, depth + 1);
      else if (schema.additionalProperties === false) fail(`未知字段 ${key}`);
      else if (typeof schema.additionalProperties === 'object') validate(child, schema.additionalProperties, `${location}.${key}`, root, depth + 1);
    }
  }
}

export function assertPath(path, allowRoot = false) {
  if (path === '.' && allowRoot) return path;
  if (typeof path !== 'string' || !path || path.length > 240 || /[\\<>:"|?*\x00-\x1f\x7f]/.test(path)) throw new Error(`无效相对路径：${path}`);
  for (const part of path.split('/')) {
    if (!part || part === '.' || part === '..' || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) throw new Error(`不安全的相对路径：${path}`);
  }
  return path;
}

export async function checkedPath(root, path, kind = 'file') {
  assertPath(path, kind === 'directory');
  if (path === '.') return root;
  let current = root;
  for (const part of path.split('/')) {
    current = join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error(`禁止符号链接：${path}`);
  }
  const info = await lstat(current);
  if (kind === 'file' ? !info.isFile() : !info.isDirectory()) throw new Error(`引用不是${kind}：${path}`);
  return current;
}

async function jsonAt(root, path) {
  const file = await checkedPath(root, path);
  if ((await lstat(file)).size > 1024 * 1024) throw new Error(`JSON 超过 1 MiB：${path}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function canonical(value, name) {
  validate(value, JSON.parse(await readFile(join(schemaRoot, `${name}.schema.json`), 'utf8')));
  return value;
}

function unique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} 重复`);
}

export function assertGitUrl(value) {
  const fail = () => { throw new Error('Git 地址 gitUrl 必须是有效的 HTTP(S)、SSH 或 user@host:path 仓库地址，不得包含凭据、查询参数或本机路径'); };
  if (typeof value !== 'string' || !value || value.length > 2048 || /\s/.test(value)) return fail();
  if (/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[^\s?#]+$/.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { return fail(); }
  if (!['http:', 'https:', 'ssh:'].includes(url.protocol) || !url.hostname || !url.pathname.replaceAll('/', '') || url.search || url.hash || url.password || (url.protocol !== 'ssh:' && url.username)) return fail();
  return value;
}

export async function readTemplate(directory) {
  const root = resolve(directory);
  const template = await jsonAt(root, '.tpl/template.json');
  await canonical(template, 'template');
  assertGitUrl(template.gitUrl);
  unique(template.surfaces.map(s => s.id), '端 id');
  for (const surface of template.surfaces) {
    if (surface.id === 'preview') throw new Error('端 id preview 为 Weelume 保留值');
    unique(surface.pages.map(p => p.slug), '页面 slug');
    if (!surface.pages.some(p => p.slug === '')) throw new Error(`端 ${surface.id} 缺少首页`);
  }
  if (template.license.redistributionAllowed && ['restricted', 'unlicensed'].includes(template.license.type)) throw new Error('许可类型与再分发声明矛盾');
  if (template.listed && !template.license.redistributionAllowed) throw new Error('没有再分发授权的模板不能声明上架');
  for (const name of requiredDocs) {
    const file = await checkedPath(root, '.tpl/' + name);
    const info = await lstat(file);
    if (!info.size || info.size > 1024 * 1024) throw new Error(`使用规则为空或过大：${name}`);
  }
  assertPath(template.license.file);
  if (!template.license.file.startsWith('docs/')) throw new Error('许可说明必须位于 .tpl/docs');
  await checkedPath(root, '.tpl/' + template.license.file);
  if (template.listed && (!template.cover || !template.screenshots.length)) throw new Error('声明上架必须提供封面和截图');
  const paths = [template.cover, ...template.screenshots.map(s => s.src)].filter(Boolean);
  if (paths.length > 1000) throw new Error('展示素材引用超过 1000 项');
  const assets = [];
  const seen = new Map();
  let totalBytes = 0;
  for (const path of paths) {
    assertPath(path);
    if (!path.startsWith('assets/')) throw new Error(`展示素材必须位于 .tpl/assets：${path}`);
    const ext = path.split('.').at(-1).toLowerCase();
    if (!media.has(ext)) throw new Error(`不支持的展示素材：${path}`);
    const key = path.normalize('NFC').toLowerCase();
    if (seen.has(key)) { if (seen.get(key) !== path) throw new Error('展示素材路径大小写冲突'); continue; }
    seen.set(key, path);
    const file = await checkedPath(root, '.tpl/' + path);
    const info = await lstat(file);
    if (info.size === 0 || info.size > 64 * 1024 * 1024) throw new Error(`展示素材为空或超过 64 MiB：${path}`);
    totalBytes += info.size;
    if (totalBytes > 256 * 1024 * 1024) throw new Error('展示素材总量超过 256 MiB');
    assets.push({ path, bytes: info.size, sha256: sha256(await readFile(file)) });
  }
  for (const shot of template.screenshots) {
    const surface = template.surfaces.find(s => s.id === shot.surfaceId);
    if (shot.surfaceId && !surface) throw new Error(`截图引用未知端：${shot.surfaceId}`);
    if (shot.pageSlug !== undefined && (!surface || !surface.pages.some(p => p.slug === shot.pageSlug))) throw new Error('截图引用未知页面');
  }
  const project = await canonical(await jsonAt(root, '.tpl/project.json'), 'project');
  const previews = resolvePreviews(template, project);
  return { root, template, project, assets, previews };
}

async function git(root, args) {
  return (await exec('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=', '-C', root, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true })).stdout.trimEnd();
}

function assertTrackedPath(path) {
  assertPath(path);
  const name = path.split('/').at(-1).toLowerCase();
  if (path.split('/').some(p => ['.git', 'node_modules', '.next', '.work', '.cache', 'dist', 'build', 'coverage'].includes(p.toLowerCase())) ||
      /\.(pem|key|p12|pfx|db|sqlite|sqlite3|log|ct|tsbuildinfo)$/i.test(name) ||
      (name.startsWith('.env') && name !== '.env.example') ||
      ['.npmrc', '.netrc', 'credentials.json', 'secrets.json', 'id_rsa', 'id_ed25519'].includes(name)) throw new Error(`Git 索引含依赖、缓存或敏感文件：${path}`);
}

function acyclic(items, label) {
  const visiting = new Set(), done = new Set();
  const visit = id => {
    if (!Object.hasOwn(items, id)) throw new Error(`${label}依赖不存在：${id}`);
    if (visiting.has(id)) throw new Error(`${label}依赖有环：${id}`);
    if (done.has(id)) return;
    visiting.add(id);
    for (const dependency of items[id].dependsOn) visit(dependency);
    visiting.delete(id); done.add(id);
  };
  Object.keys(items).forEach(visit);
}

export async function inspectProject(directory, { requireVerified = false } = {}) {
  const data = await readTemplate(directory);
  const { root } = data;
  const gitRoot = await git(root, ['rev-parse', '--show-toplevel']);
  if (resolve(gitRoot).toLowerCase() !== root.toLowerCase()) throw new Error('模板必须是独立 Git 工程根目录');
  const records = (await git(root, ['ls-files', '--stage', '-z'])).split('\0').filter(Boolean);
  const tracked = new Map(), folded = new Set();
  for (const record of records) {
    const match = /^(\d+) [a-f0-9]+ (\d)\t(.+)$/.exec(record);
    if (!match || match[2] !== '0') throw new Error('Git 索引存在未解决冲突');
    const [, mode, , path] = match;
    if (!['100644', '100755'].includes(mode)) throw new Error(`禁止 Git 符号链接或子模块：${path}`);
    assertTrackedPath(path);
    const key = path.normalize('NFC').toLowerCase();
    if (folded.has(key)) throw new Error(`Git 路径大小写冲突：${path}`);
    folded.add(key);
    const file = await checkedPath(root, path);
    if ((await lstat(file)).size > 64 * 1024 * 1024) throw new Error(`单文件超过 64 MiB：${path}`);
    tracked.set(path, file);
  }
  if (!tracked.size) throw new Error('Git 索引为空，请先 git add 登记可交付文件');
  const requireTracked = async (path, kind = 'file') => {
    await checkedPath(root, path, kind);
    if (kind === 'file' && !tracked.has(path)) throw new Error(`交付引用未加入 Git：${path}`);
  };
  for (const path of ['.tpl/template.json', '.tpl/project.json', 'AGENTS.md', '.gitignore', ...requiredDocs.map(p => '.tpl/' + p), ...data.assets.map(a => '.tpl/' + a.path), '.tpl/' + data.template.license.file]) await requireTracked(path);
  const { project } = data;
  assertPath(project.customization);
  if (project.customization !== '.tpl/customization.json') throw new Error('修改映射入口固定为 .tpl/customization.json');
  await requireTracked(project.customization);
  const customization = await canonical(await jsonAt(root, project.customization), 'customization');
  unique(customization.entries.map(e => e.id), '修改目标 id');
  for (const entry of customization.entries) {
    for (const file of entry.files) {
      await requireTracked(file.path, file.kind);
      if (file.kind === 'directory' && ![...tracked.keys()].some(p => p.startsWith(file.path === '.' ? '' : file.path + '/'))) throw new Error(`修改入口目录没有交付文件：${file.path}`);
    }
    for (const id of entry.checks) if (!Object.hasOwn(project.operations, id)) throw new Error(`修改映射检查不存在：${id}`);
  }
  for (const path of [project.toolchain.runtimeVersionFile, project.toolchain.packageManagerSource, project.environment.schema, project.environment.example]) await requireTracked(path);
  if (project.toolchain.lockfile !== null) await requireTracked(project.toolchain.lockfile);
  if (project.stage === 'ready') {
    if (!data.template.cover || !data.template.screenshots.length) throw new Error('ready 模板必须提供封面和真实截图');
    const pkg = await jsonAt(root, project.toolchain.packageManagerSource);
    if (!/^pnpm@\d+\.\d+\.\d+$/.test(pkg.packageManager || '')) throw new Error('ready 工程必须固定 pnpm 版本');
    const version = (await readFile(join(root, project.toolchain.runtimeVersionFile), 'utf8')).trim();
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Node 版本必须精确固定');
    if (!project.toolchain.lockfile || !['install', 'build', 'verify'].every(id => Object.hasOwn(project.operations, id)) || !Object.keys(project.services).length) throw new Error('ready 工程缺少锁文件、安装/构建/验证操作或服务');
    if (!project.operations.install.argv.includes('--frozen-lockfile')) throw new Error('安装操作必须冻结锁文件');
    if (!project.checks.length || !customization.entries.length) throw new Error('ready 工程必须提供实际检查与常见修改映射');
  }
  const env = await jsonAt(root, project.environment.schema);
  if (env.type !== 'object' || !env.properties || env.additionalProperties !== false) throw new Error('环境合同必须显式声明变量并禁止额外属性');
  for (const [key, field] of Object.entries(env.properties)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || field.type !== 'string' || typeof field['x-secret'] !== 'boolean' || !['public', 'server'].includes(field['x-exposure'])) throw new Error(`环境变量注解不完整：${key}`);
    if (field['x-secret'] && (field['x-exposure'] === 'public' || Object.hasOwn(field, 'default'))) throw new Error(`环境秘密不能公开或带默认值：${key}`);
  }
  const toolIds = new Set(['node', 'pnpm', 'git']);
  for (const [id, requirement] of Object.entries(project.requirements)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || toolIds.has(id)) throw new Error(`工具 id 重复、保留或不规范：${id}`);
    toolIds.add(id);
    if (requirement.kind === 'command') {
      if (!requirement.argv?.length || requirement.pathEnv) throw new Error(`命令工具必须声明版本探测 argv：${id}`);
    } else if (!requirement.pathEnv || requirement.argv || requirement.expectedVersion || !Object.hasOwn(env.properties, requirement.pathEnv) || env.properties[requirement.pathEnv]['x-secret']) throw new Error(`浏览器工具必须引用已声明的非秘密路径环境变量：${id}`);
  }
  for (const [label, commands] of [['操作', project.operations], ['服务', project.services]]) {
    acyclic(commands, label);
    for (const [id, command] of Object.entries(commands)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${label} id 不规范`);
      await requireTracked(command.cwd, 'directory');
      for (const name of command.requiredEnv) if (!Object.hasOwn(env.properties, name)) throw new Error(`未声明环境变量：${name}`);
      for (const tool of command.requiresTools) if (!toolIds.has(tool)) throw new Error(`未声明工具：${tool}`);
      for (const op of command.prepareOperations ?? []) if (!Object.hasOwn(project.operations, op)) throw new Error(`准备操作不存在：${op}`);
      if (command.port && !Object.hasOwn(env.properties, command.port.env)) throw new Error('服务端口环境变量未声明');
    }
  }
  for (const check of project.checks) if (!Object.hasOwn(project.operations, check)) throw new Error(`检查操作不存在：${check}`);
  const hashes = [];
  for (const [path, file] of [...tracked].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (!path.startsWith('.tpl/reports/')) hashes.push([path, sha256(await readFile(file))]);
  }
  const sourceDigest = sha256(JSON.stringify(hashes));
  let report;
  try {
    report = await jsonAt(root, '.tpl/reports/verification.json');
    await canonical(report, 'verification');
  } catch (error) {
    // 只把报告文件本身缺失视为 missing；路径中的链接和无效 JSON 仍然报错。
    if (error.code !== 'ENOENT') throw error;
  }
  const verification = assessVerification(report, project, sourceDigest);
  if (requireVerified && verification.state !== 'passed') throw new Error(`验收未通过：${verification.state}`);
  return { ...data, customization, trackedFiles: tracked.size, sourceDigest, verification };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), requireVerified = args.includes('--require-verified');
  const directories = args.filter(a => a !== '--require-verified');
  if (directories.length > 1 || directories.some(a => a.startsWith('--'))) { console.error('用法：node check.mjs [工程目录] [--require-verified]'); process.exitCode = 1; }
  else inspectProject(directories[0] || '.', { requireVerified }).then(result => console.log(JSON.stringify({ id: result.template.id, stage: result.project.stage, files: result.trackedFiles, sourceDigest: result.sourceDigest, verification: result.verification, formatCheck: 'passed', applicationChecks: 'not-executed' }, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
