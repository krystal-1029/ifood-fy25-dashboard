const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = process.env.PORT || 4188;
const editableHtml = path.join(root, 'editable.html');
const editableMainHtml = process.env.EDITABLE_MAIN_HTML || path.resolve(root, '../../ifood/ifood FY26 dashboard editable.html');
const designerHtml = path.join(root, 'designer.html');
const designerMainHtml = process.env.DESIGNER_MAIN_HTML || path.resolve(root, '../../ifood/ifood FY26 dashboard designer.html');
const types = {'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.pdf':'application/pdf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.txt':'text/plain;charset=utf-8'};
function serveFile(req,res){
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, clean === '/' ? 'index.html' : clean);
  if (!file.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.stat(file, (err, st)=>{
    if (err || !st.isFile()) file = path.join(root, 'index.html');
    fs.readFile(file, (e, data)=>{
      if (e) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
      res.end(data);
    });
  });
}
function saveDashboard(req,res,targets={preview:editableHtml,main:editableMainHtml,required:'id="editToolbar"'}){
  let body='';
  req.setEncoding('utf8');
  req.on('data', chunk=>{
    body += chunk;
    if (body.length > 5 * 1024 * 1024) req.destroy();
  });
  req.on('end', ()=>{
    if (!body.includes('<!doctype html>') || !body.includes(targets.required)) {
      res.writeHead(400, {'Content-Type':'text/plain;charset=utf-8'});
      res.end('Invalid dashboard html');
      return;
    }
    try {
      fs.writeFileSync(targets.preview, body, 'utf8');
      fs.writeFileSync(targets.main, body, 'utf8');
      res.writeHead(200, {'Content-Type':'application/json;charset=utf-8'});
      res.end(JSON.stringify({ok:true,preview:targets.preview,main:targets.main}));
    } catch (err) {
      res.writeHead(500, {'Content-Type':'text/plain;charset=utf-8'});
      res.end(err.message);
    }
  });
}
http.createServer((req,res)=>{
  if (req.method === 'POST' && req.url.split('?')[0] === '/save-dashboard') return saveDashboard(req,res);
  if (req.method === 'POST' && req.url.split('?')[0] === '/save-designer') return saveDashboard(req,res,{preview:designerHtml,main:designerMainHtml,required:'id="designPanel"'});
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('Method not allowed'); return; }
  serveFile(req,res);
}).listen(port, '127.0.0.1', ()=>console.log(`Preview server: http://127.0.0.1:${port}/ ; editable: http://127.0.0.1:${port}/editable.html ; designer: http://127.0.0.1:${port}/designer.html`));
