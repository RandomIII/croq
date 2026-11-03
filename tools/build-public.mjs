// Chaque déploiement a une empreinte commune à toute sa chaîne de modules.
// Un nouvel HTML ne peut ainsi pas réutiliser le JS de la version précédente.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export async function buildPublic(sourceDir,outputDir){
 const files=[];
 async function scan(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const absolute=path.join(directory,entry.name);if(entry.isDirectory())await scan(absolute);else if(entry.isFile())files.push({name:path.relative(sourceDir,absolute).split(path.sep).join('/'),bytes:await fs.readFile(absolute)});}}
 await scan(sourceDir);files.sort((a,b)=>a.name.localeCompare(b.name));
 const hash=createHash('sha256');for(const file of files)hash.update(file.name).update('\0').update(file.bytes).update('\0');
 const version=hash.digest('hex').slice(0,16);
 for(const file of files){
  let content=file.bytes;
  if(file.name.endsWith('.html'))content=content.toString('utf8').replace(/(src|href)=(["'])(\.\/[^"']+\.(?:js|css))\2/g,(_m,attr,q,url)=>`${attr}=${q}${url}?v=${version}${q}`);
  if(file.name.endsWith('.js'))content=content.toString('utf8')
   .replace(/(from\s+|import\s*\(\s*|import\s+)(["'])(\.{1,2}\/[^"']+\.js)\2/g,(_m,prefix,q,url)=>`${prefix}${q}${url}?v=${version}${q}`)
   .replace(/fetch\(\s*(["'])(\.\/[^"']+\.json)\1/g,(_m,q,url)=>`fetch(${q}${url}?v=${version}${q}`);
  const destination=path.join(outputDir,file.name);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,content);
 }
 return version;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log('Version publique : '+await buildPublic(path.join(root,'public'),path.join(root,'dist')));
}
