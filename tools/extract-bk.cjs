const fs=require('node:fs'),path=require('node:path');
// Outil d'inspection locale ; la collecte complète est npm run refresh:bk.
(async()=>{const {catalogueFrom}=await import('./bk-source.mjs');const root=path.resolve(__dirname,'..');const catalogue=catalogueFrom(fs.readFileSync(path.join(root,'research','burgerking.html'),'utf8'));fs.writeFileSync(path.join(root,'research','bk-catalog.json'),JSON.stringify(catalogue,null,2));console.log('Catalogue extrait, sans ignorer les blocs texte Flight.');})().catch(error=>{console.error(error.message);process.exitCode=1;});
