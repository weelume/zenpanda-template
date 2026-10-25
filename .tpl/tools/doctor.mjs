import { execFile } from 'node:child_process';
import { promisify, parseEnv } from 'node:util';
import { readFile, access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve, delimiter } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectProject, checkedPath } from './check.mjs';
const exec = promisify(execFile);

async function executable(path) {
  try { return (await stat(path)).isFile() && (await access(path, constants.X_OK), true); } catch { return false; }
}

// Windows npm 的 pnpm.cmd/ps1 不是可直接 execFile 的程序；解析其标准安装入口，避免拼接 Shell 字符串。
export async function invocation(program, args, env = process.env) {
  if (program === 'node') return { file: process.execPath, args };
  if (process.platform === 'win32' && program === 'pnpm') {
    for (const dir of (env.PATH || env.Path || '').split(delimiter).filter(Boolean)) {
      for (const path of [join(dir, 'pnpm.exe'), join(dir, 'node_modules/pnpm/pnpm.exe')]) if (await executable(path)) return { file: path, args };
      const script = join(dir, 'node_modules/pnpm/bin/pnpm.cjs');
      if (await executable(script)) return { file: process.execPath, args: [script, ...args] };
    }
  }
  return { file: program, args };
}

async function probeTool(id, requirement, { root, env }) {
  try {
    if (requirement.kind === 'browser') {
      const candidates = [env[requirement.pathEnv], 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
      for (const candidate of candidates) if (await executable(candidate)) return { status: 'available', detail: '发现可执行浏览器；是否支持实际渲染仍由截图验收确认。' };
      return { status: 'missing', detail: `未找到浏览器，请检查 ${requirement.pathEnv}。` };
    }
    const [program, ...args] = requirement.argv;
    const command = await invocation(program, args, env);
    const { stdout, stderr } = await exec(command.file, command.args, { cwd: root, env, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 });
    const version = `${stdout}\n${stderr}`.match(/\d+\.\d+\.\d+/)?.[0];
    if (requirement.expectedVersion && version !== requirement.expectedVersion) return { status: 'mismatch', detail: `要求 ${requirement.expectedVersion}，探测到 ${version || '无法识别版本'}。` };
    return { status: 'available', detail: version ? `版本 ${version}` : '版本探测命令退出码为 0。' };
  } catch (error) {
    // 不回显第三方版本命令的 stdout/stderr 或环境值，避免诊断泄露秘密。
    return { status: error.code === 'ENOENT' ? 'missing' : 'error', detail: `工具 ${id} 探测失败（${error.killed ? 'timeout' : error.code || 'error'}）。` };
  }
}

export async function diagnose(directory, { probe = probeTool } = {}) {
  const data = await inspectProject(directory), { root, project } = data;
  const pkg = JSON.parse(await readFile(await checkedPath(root, project.toolchain.packageManagerSource), 'utf8'));
  const runtime = (await readFile(await checkedPath(root, project.toolchain.runtimeVersionFile), 'utf8')).trim();
  const definitions = {
    node: { kind: 'command', argv: ['node', '--version'], expectedVersion: runtime, instructions: `使用 ${project.toolchain.runtimeVersionFile} 中固定的 Node 版本。` },
    pnpm: { kind: 'command', argv: ['pnpm', '--version'], ...(pkg.packageManager?.startsWith('pnpm@') ? { expectedVersion: pkg.packageManager.slice(5) } : {}), instructions: '使用 package.json 固定的 pnpm 版本；诊断不会安装工具。' },
    git: { kind: 'command', argv: ['git', '--version'], instructions: '安装 Git，并将其可执行文件加入 PATH。' },
    ...project.requirements,
  };
  let local = {};
  try { local = parseEnv(await readFile(await checkedPath(root, '.env'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const env = { ...local, ...process.env };
  const requirements = await Promise.all(Object.entries(definitions).map(async ([id, requirement]) => ({ id, ...await probe(id, requirement, { root, env }), instructions: requirement.instructions })));
  const available = new Set(requirements.filter(r => r.status === 'available').map(r => r.id));
  const operations = {}, services = {};
  const merge = results => [...new Set(results.flatMap(r => r.missingTools))].sort();
  const operation = id => {
    if (Object.hasOwn(operations, id)) return operations[id];
    const op = project.operations[id], dependencies = op.dependsOn.map(operation);
    const missingTools = merge([{ missingTools: op.requiresTools.filter(t => !available.has(t)) }, ...dependencies]);
    return operations[id] = { available: !missingTools.length, missingTools };
  };
  const service = id => {
    if (Object.hasOwn(services, id)) return services[id];
    const svc = project.services[id], dependencies = [...svc.dependsOn.map(service), ...svc.prepareOperations.map(operation)];
    const missingTools = merge([{ missingTools: svc.requiresTools.filter(t => !available.has(t)) }, ...dependencies]);
    return services[id] = { available: !missingTools.length, missingTools };
  };
  Object.keys(project.operations).forEach(operation); Object.keys(project.services).forEach(service);
  return { format: 'git-template-diagnosis', formatVersion: '0.2.0', requirements, operations, services, applicationChecks: 'not-executed' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [directory = '.', flag, id, ...extra] = process.argv.slice(2);
  if (extra.length || (flag !== undefined && (!['--operation', '--service'].includes(flag) || !id))) { console.error('用法：node doctor.mjs [工程目录] [--operation <id> | --service <id>]'); process.exitCode = 1; }
  else diagnose(directory).then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (flag) {
      const selected = result[flag === '--operation' ? 'operations' : 'services'][id];
      if (!selected) throw new Error(`操作或服务不存在：${id}`);
      if (!selected.available) process.exitCode = 1;
    }
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
