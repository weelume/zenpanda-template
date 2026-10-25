// 纯数据校验；不启动服务、不执行模板命令。
export function resolvePreviews(template, project) {
  const paths = [], seen = new Set();
  for (const preview of project.previews) {
    if (seen.has(preview.surfaceId)) throw new Error('预览端重复');
    seen.add(preview.surfaceId);
    const surface = template.surfaces.find(s => s.id === preview.surfaceId);
    if (!surface) throw new Error(`预览引用未知端：${preview.surfaceId}`);
    if (!Object.hasOwn(project.services, preview.service)) throw new Error(`预览引用未知服务：${preview.service}`);
    const locales = Object.keys(preview.localePaths);
    if (locales.length !== surface.locales.length || surface.locales.some(l => !Object.hasOwn(preview.localePaths, l))) throw new Error('预览必须完整映射该端的语言，不能增加未知语言');
    const used = new Set();
    for (const locale of surface.locales) {
      const basePath = preview.localePaths[locale];
      if (!/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/.test(basePath)) throw new Error(`预览路径必须为规范的本机绝对 URL 路径：${basePath}`);
      if (used.has(basePath)) throw new Error('预览语言路径重复');
      used.add(basePath);
      for (const page of surface.pages) {
        const path = page.slug ? `${basePath === '/' ? '' : basePath}/${page.slug}` : basePath;
        paths.push({ surfaceId: surface.id, service: preview.service, locale, pageSlug: page.slug, path });
      }
    }
  }
  const unique = new Set();
  for (const p of paths) {
    const key = JSON.stringify([p.service, p.path]);
    if (unique.has(key)) throw new Error(`预览路由冲突：${p.path}`);
    unique.add(key);
  }
  return paths;
}

function time(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new Error('验收报告时间必须为有效的 UTC ISO 时间');
  return Date.parse(value);
}

export function assessVerification(report, project, sourceDigest) {
  if (!report) return { state: 'missing', claimedStatus: null, sourceMatches: false };
  const checkedAt = time(report.checkedAt);
  const checked = new Set(), services = new Set();
  for (const check of report.checks) {
    if (checked.has(check.id)) throw new Error('验收报告检查重复');
    checked.add(check.id);
    const op = project.operations[check.id];
    if (!op || check.cwd !== op.cwd || JSON.stringify(check.argv) !== JSON.stringify(op.argv)) throw new Error(`验收报告检查命令与合同不符：${check.id}`);
    if (check.status === 'not-executed') {
      if (!check.reason || check.exitCode !== null || check.startedAt !== null || check.finishedAt !== null) throw new Error('验收报告未执行项必须保留原因且不能填写执行结果');
    } else {
      if (time(check.startedAt) > time(check.finishedAt) || time(check.finishedAt) > checkedAt) throw new Error('验收报告检查时间顺序不正确');
      if (check.status === 'passed' && check.exitCode !== 0) throw new Error('验收报告通过项的退出码必须为 0');
      if (check.status === 'failed' && (check.exitCode === 0 || (check.exitCode === null && !check.reason))) throw new Error('验收报告失败项必须有非零退出码或明确失败原因');
    }
  }
  for (const id of project.checks) if (!checked.has(id)) throw new Error(`验收报告缺少检查：${id}；未执行也必须显式记录`);
  for (const service of report.services) {
    if (services.has(service.id) || !Object.hasOwn(project.services, service.id)) throw new Error('验收报告服务重复或不存在');
    services.add(service.id);
    if (service.status === 'not-executed') {
      if (!service.reason || service.checkedAt !== null || !service.stopped) throw new Error('验收报告未执行服务必须记录原因、空时间及无遗留进程');
    } else {
      if (time(service.checkedAt) > checkedAt) throw new Error('验收报告服务时间晚于报告时间');
      if (service.status === 'passed' && !service.stopped) throw new Error('验收报告通过服务必须确认已关闭本次启动的进程');
    }
  }
  for (const id of Object.keys(project.services)) if (!services.has(id)) throw new Error(`验收报告缺少服务：${id}`);
  const results = [...report.checks, ...report.services];
  const actual = results.some(r => r.status === 'failed') ? 'failed' : results.some(r => r.status === 'not-executed') || !project.checks.length ? 'incomplete' : 'passed';
  if (actual !== report.status) throw new Error('验收报告总状态与分项状态矛盾');
  const sourceMatches = report.sourceDigest === sourceDigest;
  return { state: sourceMatches ? actual : 'stale', claimedStatus: report.status, sourceMatches };
}
