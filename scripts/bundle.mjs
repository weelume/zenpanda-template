import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { readFile,writeFile,mkdir,readdir } from 'node:fs/promises'
import { resolve,join } from 'node:path'
import { invocation } from '../.tpl/tools/doctor.mjs'
const exec=promisify(execFile),root=resolve(import.meta.dirname,'..'),output=join(root,'.work/packages')
await mkdir(output,{recursive:true})
const command=await invocation('pnpm',['pack','--pack-destination',output])
await exec(command.file,command.args,{cwd:root,windowsHide:true,maxBuffer:1024*1024})
const name=(await readdir(output)).find(name=>name.endsWith('.tgz'))
if(!name)throw new Error('No bundle created')
const archive=join(output,name),sha256=createHash('sha256').update(await readFile(archive)).digest('hex')
let sourceCommit=null
try{sourceCommit=(await exec('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true})).stdout.trim()}catch(error){if(!/unknown revision|ambiguous argument|bad revision/i.test(error.stderr??''))throw error}
const sourceDirty=(await exec('git',['status','--porcelain'],{cwd:root,windowsHide:true})).stdout.trim()!==''
const report={archive,sha256,sourceCommit,sourceDirty}
await writeFile(join(output,'bundle.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
