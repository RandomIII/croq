import fs from 'node:fs/promises';
import path from 'node:path';
export async function writeCatalogue(root,products){
 if(new Set(products.map(p=>p.id)).size!==products.length)throw new Error('Identifiants de catalogue dupliqués');
 const quote=s=>"'"+s.replace(/'/g,"''")+"'";
 await fs.mkdir(path.join(root,'public','data'),{recursive:true});
 await fs.writeFile(path.join(root,'public','data','products.json'),JSON.stringify(products,null,2)+'\n');
 await fs.writeFile(path.join(root,'supabase','seed.sql'),'-- Produits autorisés pour les avis. Aucun avis fictif.\ninsert into public.products(id,name,brand) values\n'+products.map(p=>'('+[p.id,p.name,p.brand].map(quote).join(',')+')').join(',\n')+'\non conflict(id) do update set name=excluded.name,brand=excluded.brand;\n');
}
export function mergeBK(previous,generated,editions=[]){
 const byId=new Map(generated.map(p=>[p.id,p]));
 for(const prior of previous.filter(p=>p.brand==='burgerking')){
  const next=byId.get(prior.id);
  if(!next)byId.set(prior.id,prior.temporal?.status==='archived'?prior:{...prior,isNew:false,order:300,availability:'archived',temporal:{...prior.temporal,status:'archived',...(!prior.temporal?.endsOn?{certainty:'unconfirmed',archiveNote:'Référence conservée depuis un relevé précédent, absente du nouvel import. Date de retrait non confirmée.'}:{})}});
  else if(next.temporal?.certainty==='unconfirmed'&&prior.temporal?.certainty!=='unconfirmed'&&(prior.temporal?.endsOn||prior.temporal?.status==='archived'))byId.set(prior.id,prior);
 }
 // Les fiches éditoriales sont complètes : ne pas leur réinjecter un ancien statut.
 for(const edition of editions.filter(p=>p.brand==='burgerking'))byId.set(edition.id,edition);
 return [...previous.filter(p=>p.brand!=='burgerking'),...byId.values()];
}
