import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildPublic} from '../tools/build-public.mjs';

test('Un déploiement renouvelle toute la chaîne JS et JSON, même si seul le catalogue change',async t=>{
 const tempRoot=await fs.realpath(os.tmpdir()),temporary=await fs.mkdtemp(path.join(tempRoot,'croq-cache-'));
 t.after(async()=>{assert.equal(path.dirname(temporary),tempRoot);await fs.rm(temporary,{recursive:true,force:true});});
 const source=path.join(temporary,'source'),out=path.join(temporary,'out');await fs.mkdir(source);
 await fs.writeFile(path.join(source,'index.html'),'<link href="./style.css"><script src="./config.js"></script><script type="module" src="./app.js"></script>');
 await fs.writeFile(path.join(source,'app.js'),"import {filter} from './catalogue.js'; import './backend.js'; fetch('./data/products.json');");
 await fs.writeFile(path.join(source,'catalogue.js'),"import {isArchived} from './availability.js';");
 await fs.writeFile(path.join(source,'availability.js'),'export const isArchived=()=>false;');
 await fs.writeFile(path.join(source,'products.json'),'[]');
 const first=await buildPublic(source,out);
 assert.equal(await buildPublic(source,out),first);
 for(const file of ['index.html','app.js','catalogue.js']){const contents=await fs.readFile(path.join(out,file),'utf8');assert.ok(contents.includes('?v='+first));assert.ok(!/(?:from\s+|import\s+|src=|href=)["']\.\/[^"']+\.(?:js|css)["']/.test(contents));}
 assert.ok((await fs.readFile(path.join(out,'app.js'),'utf8')).includes("fetch('./data/products.json?v="+first+"')"));
 await fs.writeFile(path.join(source,'products.json'),'[{"id":"new"}]');
 const second=await buildPublic(source,out);assert.notEqual(second,first);
 assert.ok((await fs.readFile(path.join(out,'app.js'),'utf8')).includes('?v='+second));
});
