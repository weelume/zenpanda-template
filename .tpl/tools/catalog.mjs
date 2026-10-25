import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readTemplate } from './check.mjs';

// 市场索引只读取 JSON、规则和素材，不 import 模板 TS，不调用模板命令。
export async function catalog(directory) {
  const { template, assets, previews } = await readTemplate(directory);
  return { format: 'git-template-catalog-entry', formatVersion: '0.2.0', template, assets, previews };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [directory, flag, out, ...extra] = process.argv.slice(2);
  if (!directory || extra.length || (flag !== undefined && (flag !== '--out' || !out))) {
    console.error('用法：node scripts/catalog.mjs <工程或只含 .tpl 的快照目录> [--out <新文件.json>]'); process.exitCode = 1;
  } else {
    catalog(directory).then(async entry => {
      const json = JSON.stringify(entry, null, 2) + '\n';
      if (out) await writeFile(resolve(out), json, { flag: 'wx' });
      else console.log(json.trimEnd());
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
