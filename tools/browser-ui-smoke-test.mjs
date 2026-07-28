import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let p=decodeURIComponent(u.pathname);if(p==='/')p='/index.html';const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end('not found');return;}res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
const pages=[['control',`http://127.0.0.1:${port}/control/`],['recommendations',`http://127.0.0.1:${port}/recommendation-engine.html`]];
const widths=[1280,390];const failures=[];
for(const [name,url] of pages)for(const width of widths){let dom='';try{dom=execFileSync('/usr/bin/chromium',['--headless','--no-sandbox','--disable-gpu',`--window-size=${width},900`,'--virtual-time-budget=5000','--dump-dom',url],{encoding:'utf8',maxBuffer:20_000_000,stdio:['ignore','pipe','pipe']});}catch(e){failures.push(`${name}@${width}: chromium failed`);continue;}const status=dom.match(/data-ui-self-test="([^"]+)"/)?.[1];const overflow=dom.match(/data-ui-overflow-count="([^"]+)"/)?.[1];if(status!=='pass')failures.push(`${name}@${width}: UI self-test=${status||'missing'}, overflow=${overflow||'unknown'}`)}
server.close();if(failures.length){for(const f of failures)console.error('FAIL:',f);process.exit(1)}console.log(`Browser UI smoke test: ${pages.length*widths.length} passed, 0 failed`);
