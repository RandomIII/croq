// Lecture des sources publiques BK, sans exécuter leur JavaScript.
export function flightRecords(html){
 const chunks=[...html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)].map(m=>{try{return JSON.parse(m[1])[1]||'';}catch{return '';}}).join('');
 const bytes=Buffer.from(chunks),records=new Map();let pos=0;
 while(pos<bytes.length){
  if(bytes[pos]===10){pos++;continue;}
  const head=bytes.subarray(pos,pos+40).toString().match(/^([0-9a-f]*):/i);if(!head)throw new Error('Format Flight BK non reconnu à '+pos);
  pos+=Buffer.byteLength(head[0]);
  const text=bytes.subarray(pos,pos+30).toString().match(/^T([0-9a-f]+),/i);
  if(text){pos+=text[0].length;const size=parseInt(text[1],16);if(pos+size>bytes.length)throw new Error('Texte Flight BK tronqué');records.set(head[1],bytes.subarray(pos,pos+size).toString());pos+=size;continue;}
  let end=bytes.indexOf(10,pos);if(end<0)end=bytes.length;
  const row=bytes.subarray(pos,end).toString();try{records.set(head[1],JSON.parse(row));}catch{/* Références de modules React, non nécessaires aux données. */}pos=end+1;
 }
 return records;
}
export function walk(value,visit){if(!value||typeof value!=='object')return;visit(value);for(const child of Object.values(value))walk(child,visit);}
export function catalogueFrom(html){let found;for(const record of flightRecords(html).values())walk(record,v=>{if(v.products&&v.menus&&v.categories&&v.allergens)found=v;});if(!found||Object.keys(found.products).length<20)throw new Error('Catalogue BK absent ou incomplet');return found;}
export function publicCampaigns(html){
 const found=new Map();
 const add=(v,promoted=false)=>{if(typeof v.actionUrl!=='string'||v.external)return;let url;try{url=new URL(v.actionUrl,'https://www.burgerking.fr');}catch{return;}if(url.origin!=='https://www.burgerking.fr'||!url.pathname.startsWith('/page/'))return;const prior=found.get(url.href)||{url:url.href,titles:[],image:null,promoted:false};const title=v.label||v.imageTitle||v.title;if(title)prior.titles.push(title.replace(/^(?:PRIMAIRE|SECONDAIRE|TERTIAIRE)\s*\d*\s*[-:]\s*/i,''));prior.image||=v.imageUrlLandscape?.[0]||null;prior.promoted||=promoted;found.set(url.href,prior);};
 for(const record of flightRecords(html).values())walk(record,v=>{
  if(v.marketingAnimations)for(const [slot,items]of Object.entries(v.marketingAnimations))walk(items,item=>add(item,slot==='primary'));
  if(v.iconCode==='KING_DEAL')walk(v,item=>add(item));
 });
 return [...found.values()].map(c=>({...c,titles:[...new Set(c.titles)]}));
}
export function normalize(value){return value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
export function htmlText(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&(nbsp|amp|quot|apos|euro|rsquo|lsquo|laquo|raquo|eacute|egrave|agrave|ecirc|ocirc|ucirc|ccedil);/g,(_,n)=>({nbsp:' ',amp:'&',quot:'"',apos:"'",euro:'€',rsquo:'’',lsquo:'‘',laquo:'«',raquo:'»',eacute:'é',egrave:'è',agrave:'à',ecirc:'ê',ocirc:'ô',ucirc:'û',ccedil:'ç'}[n])).replace(/\s+/g,' ').trim();}
export function documentHtml(html){
 // Les contenus CMS peuvent être dans un bloc texte Flight et non dans le DOM initial.
 const texts=[...flightRecords(html).values()].filter(v=>typeof v==='string'&&/<(?:h1|h2|article|p|section)\b/i.test(v));
 return texts.sort((a,b)=>b.length-a.length)[0]||html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
}
export function linksFrom(html){return [...new Set([...html.matchAll(/(?:href|actionUrl)\s*(?:=|:)\s*["']([^"']+)["']/gi)].map(m=>{try{const u=new URL(m[1].replace(/&amp;/g,'&'),'https://www.burgerking.fr');return u.origin==='https://www.burgerking.fr'?u.href:null;}catch{return null;}}).filter(Boolean))];}

const months=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
export function campaignPeriod(html){
 const text=normalize(htmlText(documentHtml(html)));
 // On exige une période de l'offre ou de l'opération, pas celle d'un code ou d'un jeu.
 const m=text.match(/(?:operation se deroulera|offre (?:est )?valable) du (\d{1,2}) ([a-z]+)(?: (20\d{2}))? au (\d{1,2}) ([a-z]+) (20\d{2})/);
 if(!m)return null;const startMonth=months.indexOf(m[2])+1,endMonth=months.indexOf(m[5])+1;if(!startMonth||!endMonth)return null;
 const endYear=Number(m[6]),startYear=Number(m[3]||endYear-(startMonth>endMonth?1:0));
 const iso=(y,mo,d)=>`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const startsOn=iso(startYear,startMonth,m[1]),endsOn=iso(endYear,endMonth,m[4]);
 if(startsOn>endsOn||new Date(startsOn).toISOString().slice(0,10)!==startsOn||new Date(endsOn).toISOString().slice(0,10)!==endsOn)return null;
 return {startsOn,endsOn};
}
export function campaignPrices(html){
 const document=documentHtml(html),offers=[];
 for(const li of document.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){
  const text=htmlText(li[1]);
  const amount=text.match(/\((\d+(?:[.,]\d{1,2})?)\s*€\s*TTC\)/i);
  const name=text.match(/ci-après[^«]*«\s*([^»]+)\s*»/i);
  const composition=text.match(/comprenant\s+(.+?)(?:,?\s+au prix|\))/i)?.[1]?.replace(/[,\s]+$/,'');
  if(amount&&name)offers.push({name:name[1].trim(),amount:Number(amount[1].replace(',','.')),...(composition?{composition}:{})});
 }
 return offers;
}
export function campaignReferences(bk,campaign,html){
 const found=new Map(),add=(kind,id)=>{if(id)found.set(kind+':'+id,{kind,id});};
 for(const link of new Set([...linksFrom(html),...linksFrom(documentHtml(html))])){const url=new URL(link),m=url.pathname.match(/^\/(menu|produit)\/(.+)/);if(m)add(m[1]==='menu'?'MENU':'PRODUCT',(m[1]==='menu'?bk.menusByRoute:bk.productsByRoute)?.[m[2]]);}
 for(const title of campaign.titles){
  const matches=[...Object.values(bk.products).map(p=>({...p,kind:'PRODUCT'})),...Object.values(bk.menus).map(p=>({...p,kind:'MENU'}))].filter(p=>normalize(p.name)===normalize(title));
  // Un nom partagé par plusieurs anciennes variantes ne permet pas de choisir la bonne.
  if(matches.length===1)add(matches[0].kind,matches[0].id);
  else {const menus=matches.filter(p=>p.kind==='MENU');if(menus.length===1)add('MENU',menus[0].id);}
 }
 return [...found.values()];
}
export function menuReachability(bk){
 const found=new Map();
 function visit(id,category,isNew,seen){if(seen.has(id))return;seen.add(id);const c=bk.categories[id];for(const [key,kind]of Object.entries(c?.items||{})){if(kind==='CATEGORY')visit(key,category,isNew,seen);else if((kind==='MENU'&&bk.menus[key])||(kind==='PRODUCT'&&bk.products[key])){const prior=found.get(kind+':'+key);found.set(kind+':'+key,{kind,id:key,category:prior?.category&&prior.category!=='Accompagnements'?prior.category:category,isNew:isNew||prior?.isNew||false,evidence:'category'});}}}
 for(const c of Object.values(bk.categories).filter(c=>c.inHeaders)){
  const category=['burgers','nouveautes'].includes(c.routeId)?'Burgers':c.routeId==='desserts-boissons'?'Desserts':['wrap','salade'].includes(c.routeId)?'Wraps & salades':'Accompagnements';
  visit(c.id,category,c.routeId==='nouveautes',new Set());
 }
 return found;
}

export function normalizeBK(bk,campaigns,checkedAt){
 const reached=menuReachability(bk),proof=new Map();
 for(const campaign of campaigns)for(const ref of campaign.references){const key=ref.kind+':'+ref.id;proof.set(key,campaign);if(!campaign.period||campaign.period.endsOn>=checkedAt)reached.set(key,{...reached.get(key),...ref,isNew:true,evidence:'campaign'});}
 const labels={'product.nutritional.energy':'Énergie','product.nutritional.fat':'Lipides','product.nutritional.saturates':'Acides gras saturés','product.nutritional.protein':'Protéines','product.nutritional.carbs':'Glucides','product.nutritional.sugars':'Sucres','product.nutritional.salt':'Sel'};
 const clean=s=>htmlText(s||'').replace(/\u2014/g,',');
 const entries=[],coverage={PRODUCT:{total:0,current:0,unconfirmed:0,datedArchive:0},MENU:{total:0,current:0,unconfirmed:0,datedArchive:0}};
 for(const [kind,collection]of [['PRODUCT',bk.products],['MENU',bk.menus]])for(const p of Object.values(collection)){
  if(!p.id||!p.name||!p.routeId)throw new Error('Référence BK sans identifiant, nom ou route');
  const key=kind+':'+p.id,meta=reached.get(key),campaign=proof.get(key),past=campaign?.period?.endsOn<checkedAt,current=Boolean(meta)&&!past;
  let category=kind==='MENU'?'Menus':meta?.category||(/wrap|salade|tortilla/i.test(p.name)?'Wraps & salades':p.type==='DRINK'?'Boissons':p.type==='BURGER'?'Burgers':'Références');
  if(kind==='PRODUCT'&&(p.type==='DRINK'||/^(coca|fanta|sprite|fuzetea|vittel|perrier|café|cafe|expresso|espresso|thé|capri|minute maid|lipton|oasis)/i.test(p.name)))category='Boissons';
  const validImage=p.image&&!/TO_CONTRIBUTE/i.test(p.image),description=clean(p.description);
  const entry={id:(kind==='MENU'?'bk-menu-':'bk-')+p.id,brand:'burgerking',name:clean(p.name),category,recordType:campaign?'offer':kind==='MENU'?'menu':'product',checkedAt,availability:current?'listed':'archived',description:/^(?:to complete|a completer|test)$/i.test(normalize(description))?'':description,descriptionType:'official',image:validImage?p.image+'?w=600&org_if_sml=1':'./edition-poster.svg',source:campaign?.url||'https://www.burgerking.fr/carte',sourceReference:p.id,price:{solo:null,menu:null},allergens:kind==='PRODUCT'&&p.displayAllergens&&Array.isArray(p.allergens)?p.allergens.map(id=>bk.allergens[id]?.name).filter(Boolean):null,traces:kind==='PRODUCT'?(p.traces||[]).map(id=>bk.allergens[id]?.name).filter(Boolean):[],ingredients:kind==='PRODUCT'?[...new Set((p.ingredients||[]).map(i=>clean(i.name)))]:[],nutrition:kind==='PRODUCT'&&p.displayNutrition?(p.nutrition||[]).map(n=>({label:labels[n.item]||n.item,value:n.portion,unit:n.unit})):[],isNew:current&&Boolean(meta?.isNew),order:current?(p.name==='Whopper®'?2:p.name==='Big King®'?10:campaign?4:60):300,importEvidence:meta?.evidence||'catalogue-reference'};
  if(!validImage)entry.imageCaption='La source ne fournit pas de visuel exploitable pour cette référence.';
  if(kind==='MENU')entry.allergenNote='Les allergènes dépendent des produits et variantes choisis dans cette formule.';
  if(campaign?.period){entry.temporal={...campaign.period,...(past?{status:'archived'}:{})};entry.editionYear=Number(campaign.period.startsOn.slice(0,4));}
  if(!current&&!campaign?.period)entry.temporal={status:'archived',certainty:'unconfirmed',archiveNote:'Référence retrouvée dans les données publiques Burger King, sans lien depuis la carte ou une campagne actuelle. Période de vente et retrait non confirmés. Cette fiche reste conservée à dater.'};
  if(campaign){
   entry.campaignSource=campaign.url;if(campaign.termsUrl)entry.termsSource=campaign.termsUrl;
   if(!entry.description){entry.description='Offre présentée par Burger King. La composition et les variantes sont détaillées dans les conditions officielles.';entry.descriptionType='summary';}
   const named=campaign.prices.filter(price=>normalize(price.name).includes(normalize(p.name)));
   const basic=named.find(price=>normalize(price.name)===normalize(p.name)),drink=named.find(price=>/boisson/i.test(price.name));
   if(basic?.composition){entry.description='Composition annoncée : '+basic.composition+'. '+(campaign.randomSelection?'Les produits sont attribués sans choix de la combinaison.':'Variantes et conditions dans la source officielle.');entry.descriptionType='summary';}
   if(basic||drink)entry.price={solo:basic?.amount??null,menu:drink?.amount??null,soloLabel:basic?.name,menuLabel:drink?.name,kind:'offer',source:campaign.termsUrl||campaign.url,checkedAt,restaurant:'Périmètre indiqué dans les conditions officielles',note:'Tarifs issus des modalités de cette opération. Coupons, canaux de commande, stocks et restrictions sont précisés dans la source officielle.'};
   if(campaign.period){entry.schedule={weekdays:[1,2,3,4,5,6,7],campaign:'bk-'+new URL(campaign.url).pathname.split('/').pop(),campaignTitle:entry.name,conditions:campaign.appOnly?'Coupon dans l’application BK requis. Selon les stocks et les conditions officielles.':'Pendant la période annoncée, selon les stocks et les conditions de l’opération.'};}
   if(campaign.allergyWarning)entry.allergenNote='L’enseigne déconseille cette offre aux personnes ayant des allergies alimentaires. Demande les informations correspondant à la combinaison remise au restaurant.';
  }
  coverage[kind].total++;coverage[kind][current?'current':campaign?.period?'datedArchive':'unconfirmed']++;entries.push(entry);
 }
 return {entries,coverage};
}
export function assertCampaignCoverage(campaigns){const missing=campaigns.filter(c=>c.promoted&&!c.references.length);if(missing.length)throw new Error('Campagne mise en avant non reliée au catalogue : '+missing.map(c=>c.url).join(', ')+'. Import interrompu pour éviter une omission silencieuse.');}
