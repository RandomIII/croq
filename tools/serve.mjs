import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!['127.0.0.1:5088','localhost:5088'].includes(req.headers.host)){res.writeHead(403).end();return;}
  if(pathname==='/__mobile'&&process.env.CROQ_RESEARCH==='1'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<!doctype html><html lang="fr"><title>Croq, contrôle mobile</title><style>body{margin:0;background:#ddd6c9;display:flex;justify-content:center}iframe{width:390px;height:844px;border:0;background:white}</style><iframe title="Croq sur mobile" src="/"></iframe></html>');return;
  }
  // Formulaire de travail local : ne fait pas partie du site publié.
  if(pathname==='/__research'&&process.env.CROQ_RESEARCH==='1'){
    if(req.method==='POST'){
      if(req.headers.origin&&!['http://127.0.0.1:5088','http://localhost:5088'].includes(req.headers.origin)){res.writeHead(403).end();return;}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4000000){res.writeHead(413).end();return;}}
      const params=new URLSearchParams(body),data=JSON.parse(params.get('data'));
      if(!['kfc','mcdonalds','kfc-details','quick-details'].includes(data.source)||!Array.isArray(data.products))throw new Error();
      await fs.mkdir(new URL('../research/',import.meta.url),{recursive:true});
      await fs.writeFile(new URL('../research/'+data.source+'-browser.json',import.meta.url),JSON.stringify(data,null,2));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<h1>Relevé enregistré</h1><p>'+data.products.length+' fiches enregistrées.</p>');return;
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<!doctype html><html lang="fr"><title>Relevé local Croq</title><h1>Import du relevé officiel</h1><form method="post"><label>Données JSON<textarea name="data" aria-label="Données JSON" rows="15" cols="100"></textarea></label><p><button>Enregistrer le relevé</button></p></form></html>');return;
  }
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}
  const body=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Page introuvable');}
});
server.listen(5088,'127.0.0.1',()=>console.log('Croq : http://127.0.0.1:5088'));
