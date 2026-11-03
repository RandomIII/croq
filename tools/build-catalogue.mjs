// Normalise les relevés officiels. Les exports bruts restent hors du dépôt.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,'research',f),'utf8').replace(/^\uFEFF/,''));
const exists=f=>fs.existsSync(path.join(root,'research',f));
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/\u2014/g,',').trim();
const date='2026-11-03';
const base={checkedAt:date,availability:'listed',price:{solo:null,menu:null},traces:[],nutrition:[],allergens:null,ingredients:[],isNew:false};
const products=[];
const mcImage='https://eu-images.contentstack.com/v3/assets/blt5004e64d3579c43f/';
const mc=[
 {id:'mc-big-mac',name:'Big Mac™',slug:'big-mac',image:mcImage+'blt53e76fa73b472f03/666c66deb01d0ed0814618a2/BigMac_GLOBAL_400x400px_72DPI.png?auto=webp',description:'Deux steaks hachés, un pain à trois étages et la sauce Big Mac. Le grand classique de McDonald’s.',descriptionType:'summary',ingredients:['Viande','Pain','Salade','Fromage','Sauce','Oignons','Cornichons'],allergens:['Gluten','Sésame','Lait','Moutarde','Œufs'],nutrition:[{label:'Énergie',value:'530',unit:'kcal'},{label:'Protéines',value:'27',unit:'g'},{label:'Lipides',value:'27',unit:'g'},{label:'Glucides',value:'42',unit:'g'},{label:'Sel',value:'2,3',unit:'g'}],order:1},
 {id:'mc-beef-beaufort',name:'Beef Beaufort',slug:'beef-beaufort',image:mcImage+'blt2b3446b2f3cf4679/6ab639b3154797c0d1a19b9f/16333.jpg?auto=webp',description:'Bœuf, Beaufort AOP, sauce au Beaufort, oignons rouges marinés, oignons frits et galette de pommes de terre.',descriptionType:'summary',ingredients:['Viande','Pain','Sauce','Oignons frits','Beaufort','Pickles d’oignon rouge','Galette de pommes de terre'],allergens:['Sulfites','Gluten','Lait','Œufs'],nutrition:[{label:'Énergie',value:'700',unit:'kcal'},{label:'Protéines',value:'35',unit:'g'},{label:'Sel',value:'2,6',unit:'g'}],isNew:true,order:5},
 {id:'mc-chicken-raclette',name:'Chicken Raclette',slug:'chicken-raclette',image:mcImage+'blt5e90b13631ac3eb4/6ab639b388dad59eaa698da1/16635.jpg?auto=webp',description:'Poulet pané, raclette fumée et sauce au Beaufort, avec du bacon, des cornichons et des oignons frits.',descriptionType:'summary',ingredients:['Poulet','Sauce','Bacon','Cornichons','Oignons frits','Pain','Raclette'],allergens:['Gluten','Lait'],nutrition:[{label:'Énergie',value:'703',unit:'kcal'},{label:'Protéines',value:'31',unit:'g'},{label:'Sel',value:'3,5',unit:'g'}],isNew:true,order:9}
];
for(const p of mc)products.push({...base,brand:'mcdonalds',category:'Burgers',...p,source:'https://www.mcdonalds.fr/nos-produits/nos-burgers/'+p.slug});
if(exists('mcdonalds-browser.json')){
 const seen=new Set(products.filter(p=>p.brand==='mcdonalds').map(p=>p.name.toLowerCase().replace(/^(le |la |les |l[’'])/,'').replace(/[®™]/g,'').trim()));
 for(const p of read('mcdonalds-browser.json').products){
  const name=clean(p.name).replace(/^(Le |La |Les |L[’'])/,'');
  const key=name.toLowerCase().replace(/[®™]/g,'').trim();
  if(seen.has(key))continue;seen.add(key);
  if(!p.name||!p.source.includes('/nos-produits/'))continue;
  let category=({'menus':'Menus','nos-burgers':'Burgers','nos-salades-du-jour':'Wraps & salades','nos-boissons':'Boissons','nos-desserts':'Desserts','nos-frites-et-sauces':'Accompagnements','offre-mccafe':'Boissons','petit-dejeuner':'Petit-déjeuner','gateaux-anniversaire':'Desserts'})[p.section]||'Accompagnements';
  if(/wrap|salade/i.test(name))category='Wraps & salades';if(/nuggets/i.test(name))category='Poulet';if(/sauce|ketchup/i.test(name))category='Sauces';
  if(p.section==='petite-faim'&&/sundae|milkshake|macaron|donut|pops|apple|ananas|pomme|raisin|bio|danonino|berlingo/i.test(name))category='Desserts';
  products.push({...base,...p,name,id:'mc-'+key.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),brand:'mcdonalds',category,description:p.description||'',descriptionType:'official',order:160});
 }
}
if(exists('bk-catalog.json')){
 const bk=read('bk-catalog.json');
 const labels={'product.nutritional.energy':'Énergie','product.nutritional.fat':'Lipides','product.nutritional.saturates':'Acides gras saturés','product.nutritional.protein':'Protéines','product.nutritional.carbs':'Glucides','product.nutritional.sugars':'Sucres','product.nutritional.salt':'Sel'};
 const reached=new Map();
 function visit(id,category,isNew=false,seen=new Set()){
  if(seen.has(id))return;seen.add(id);
  const c=bk.categories[id];if(!c?.items)return;
  for(const [key,type] of Object.entries(c.items)){
   if(type==='CATEGORY')visit(key,category,isNew,seen);
   if(type==='PRODUCT'&&bk.products[key]){const prior=reached.get(key);reached.set(key,{category:prior?.category||category,isNew:isNew||prior?.isNew||false});}
  }
 }
 for(const c of Object.values(bk.categories).filter(c=>c.inHeaders)){
  let category=c.routeId==='burgers'?'Burgers':c.routeId==='desserts-boissons'?'Desserts':c.routeId==='wrap'?'Wraps & salades':c.routeId==='salade'?'Wraps & salades':'Accompagnements';
  if(!['nouveautes','menus','menus-enfants','bon-et-pas-cher','poulet-du-dimanche'].includes(c.routeId)&&c.routeId)visit(c.id,category);
 }
 const novelty=Object.values(bk.categories).find(x=>x.routeId==='nouveautes');if(novelty)visit(novelty.id,'Burgers',true);
 const featured=['Whopper®','Big King®','Steakhouse','Master Raclette Poivre'];
 for(const [id,meta]of reached){
  const p=bk.products[id];if(!p.image||!p.routeId)continue;
  let category=meta.category;if(p.type==='DRINK'||/^(coca|fanta|sprite|fuzetea|vittel|perrier|café|cafe|expresso|espresso|thé|capri|minute maid|lipton|oasis)/i.test(p.name))category='Boissons';
  products.push({...base,id:'bk-'+id,brand:'burgerking',category,name:clean(p.name),description:clean(p.description),descriptionType:'official',image:p.image+'?w=600&org_if_sml=1',source:'https://www.burgerking.fr/carte',allergens:p.displayAllergens?(p.allergens||[]).map(x=>bk.allergens[x]?.name).filter(Boolean):null,traces:(p.traces||[]).map(x=>bk.allergens[x]?.name).filter(Boolean),ingredients:[...new Set((p.ingredients||[]).map(x=>clean(x.name)))],nutrition:p.displayNutrition?(p.nutrition||[]).map(n=>({label:labels[n.item]||n.item,value:n.portion,unit:n.unit})):[],isNew:meta.isNew||/Master.*Raclette/i.test(p.name),order:p.name==='Whopper®'?2:p.name==='Big King®'?10:featured.includes(p.name)?6:60});
 }
}
const quickAllergen='https://assets.quick.fr/BAT_Allergenes_Quick_TF_10_Anim9_MAJ_27_10_2026_253ebb2973.pdf';
const quickCategories={burgers:'Burgers','finger-food':'Accompagnements',frites:'Accompagnements',desserts:'Desserts','boissons-froides':'Boissons',salades:'Wraps & salades'};
let quickMenus=[];
if(exists('quick-menu.html')){const h=fs.readFileSync(path.join(root,'research','quick-menu.html'),'utf8');const m=h.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);if(m)quickMenus=JSON.parse(m[1]).props.pageProps.dehydratedState.queries.find(q=>q.queryKey[0]==='category-products')?.state.data||[];}
const quickSeen=new Set();
for(const [slug,category]of Object.entries(quickCategories)){
 const f='quick-'+slug+'.html';if(!exists(f))continue;
 const h=fs.readFileSync(path.join(root,'research',f),'utf8');const m=h.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);if(!m)continue;
 const j=JSON.parse(m[1]);const data=j.props.pageProps.dehydratedState.queries.find(q=>q.queryKey[0]==='category-products')?.state.data||[];
 for(const p of data){if(quickSeen.has(p.id))continue;quickSeen.add(p.id);
 const menu=quickMenus.find(m=>m.slug===p.slug);
 const solo=p.product_specs?.find(s=>s.active&&s.available)?.price;
 const menuPrice=menu?.menu_specs?.find(s=>s.active&&s.available)?.price;
 const price={solo:solo>0?solo:null,menu:menuPrice>0?menuPrice:null,kind:'catalogue',restaurant:'Non précisé par la source',channel:'Catalogue public Quick, Click & Collect',source:'https://www.quick.fr/produits/'+p.link,checkedAt:date,note:'Tarifs indicatifs du catalogue public Quick relevés le 03/11/2026, sans restaurant identifié. Menu de taille M lorsqu’il est renseigné. Confirme le prix dans ton restaurant.'};
 products.push({...base,id:'quick-'+p.id,brand:'quick',category:/wrap/i.test(p.name)?'Wraps & salades':category,name:clean(p.name),description:clean(p.description),descriptionType:'official',image:p.image,source:'https://www.quick.fr/produits/'+p.link,price,allergenSource:quickAllergen,order:p.name==='Giant'?3:p.name==="Quick N'Toast"?7:80});
 }
}
if(exists('kfc-browser.json')){
 const groups=read('kfc-browser.json').products,seen=new Set();
 const details=exists('kfc-details-browser.json')?read('kfc-details-browser.json').products:[];
 for(const group of groups.filter(g=>g.section!=='menu-1110'))for(const p of group.products){
  const key=p.name.toLowerCase().replace(/[®™]/g,'');if(seen.has(key))continue;seen.add(key);
  const filename=new URL(p.image).pathname.split('/').pop().replace(/\.jpg$/,'');
  const detail=details.find(d=>d.name===p.name);
  let category=group.section==='menu-1103'?'Desserts':group.section==='menu-1104'?'Boissons':group.section==='menu-1145'?'Sauces':group.section==='menu-1102'?'Accompagnements':/Tenders|Wings|Bucket/i.test(p.name)?'Poulet':/Salade|Boxmaster|Wrapper/i.test(p.name)?'Wraps & salades':'Burgers';
  let description='',allergens=null,nutrition=[];
  if(detail?.text){
   const t=detail.text;description=clean(t.split('DESCRIPTION')[1]?.split('ALLERGÈNES')[0]);
   const a=t.split('ALLERGÈNES')[1]?.split('VALEURS NUTRITIONNELLES')[0];
   if(a!==undefined)allergens=a.split('\n').map(clean).filter(Boolean).map(a=>a==='S02'?'Sulfites':a);
   const table=t.split('VALEURS NUTRITIONNELLES')[1]?.split('En savoir plus')[0];
   if(table){const lines=table.split('\n').map(x=>x.trim()).filter(Boolean);for(let i=0;i<lines.length;i++){let line=lines[i];let m=line.match(/^(kcal|Protéines|Lipids|Dont AGS|Glucides|Dont Sucres|Sel|Fibres)\s+([\d,.]+)\s+([\d,.]+)/);if(m)nutrition.push({label:({kcal:'Énergie',Lipids:'Lipides','Dont AGS':'Acides gras saturés','Dont Sucres':'Sucres'})[m[1]]||m[1],value:m[3],unit:m[1]==='kcal'?'kcal':'g'});}}
  }
  products.push({...base,id:'kfc-'+filename.toLowerCase().replace(/[^a-z0-9-]/g,'-')+'-'+key.replace(/[^a-z0-9]/g,'').slice(-12),brand:'kfc',category,name:clean(p.name),description,descriptionType:'official',image:p.image,source:detail?.source||'https://www.kfc.fr/notre-carte',allergenSource:'https://www.kfc.fr/informations-sur-les-allergenes',allergens,nutrition,isNew:/Raclette/i.test(p.name),order:/^Colonel Original®$/.test(p.name)?4:/^5 Tenders/.test(p.name)?8:/^Tower® Cheese/.test(p.name)?12:100});
 }
}
// Les remplacements locaux sont explicites et conservés entre deux reconstructions.
const overrides=path.join(root,'data','overrides.json');if(fs.existsSync(overrides)){const o=JSON.parse(fs.readFileSync(overrides,'utf8'));for(const p of products)Object.assign(p,o[p.id]||{});}
fs.mkdirSync(path.join(root,'public','data'),{recursive:true});
fs.writeFileSync(path.join(root,'public','data','products.json'),JSON.stringify(products,null,2)+'\n');
const quote=s=>"'"+s.replace(/'/g,"''")+"'";
fs.writeFileSync(path.join(root,'supabase','seed.sql'),'-- Produits autorisés pour les avis. Aucun avis fictif.\ninsert into public.products(id,name,brand) values\n'+products.map(p=>'('+[p.id,p.name,p.brand].map(quote).join(',')+')').join(',\n')+'\non conflict(id) do update set name=excluded.name,brand=excluded.brand;\n');
console.log(JSON.stringify({total:products.length,brands:Object.fromEntries(['mcdonalds','burgerking','quick','kfc'].map(b=>[b,products.filter(p=>p.brand===b).length])),allergenes:products.filter(p=>p.allergens!==null).length},null,2));
