import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parisClock} from '../public/availability.js';
import {catalogueFrom,publicCampaigns,documentHtml,linksFrom,campaignReferences,campaignPeriod,campaignPrices,htmlText,normalizeBK,assertCampaignCoverage} from './bk-source.mjs';
import {mergeBK,writeCatalogue} from './catalogue-output.mjs';
const root=new URL('../',import.meta.url),date=parisClock().date,cache=new Map(),fetched=[];
async function get(url){
 if(cache.has(url))return cache.get(url);
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`${url} : HTTP ${response.status}`);
 if(new URL(response.url).origin!=='https://www.burgerking.fr')throw new Error('Redirection hors du domaine BK');
 const html=await response.text();if(html.length>8_000_000)throw new Error('Source BK trop volumineuse');
 cache.set(url,html);fetched.push({url,bytes:Buffer.byteLength(html)});return html;
}
// Les sources sont toutes publiques. Aucun compte, coupon privé ou application connectée.
const home=await get('https://www.burgerking.fr/'),bk=catalogueFrom(await get('https://www.burgerking.fr/carte'));
const discovered=publicCampaigns(home);if(!discovered.length||discovered.length>50)throw new Error('Découverte des campagnes BK incohérente');
const campaigns=[],warnings=[];
for(const campaign of discovered){
 try{
  const page=await get(campaign.url),document=documentHtml(page),references=campaignReferences(bk,campaign,page);
  const terms=[...new Set([...linksFrom(page),...linksFrom(document)])].filter(url=>/\/page\/(?:reglement|modalites|conditions)[-/]/i.test(new URL(url).pathname));
  let period=campaignPeriod(page),prices=campaignPrices(page),termsUrl=null,allergyWarning=false,appOnly=false,randomSelection=false;
  for(const url of terms){const legal=await get(url);period||=campaignPeriod(legal);const extracted=campaignPrices(legal);if(extracted.length)prices=extracted;if(extracted.length||campaignPeriod(legal))termsUrl=url;const text=htmlText(documentHtml(legal)).normalize('NFD').replace(/\p{Diacritic}/gu,'');allergyWarning||=/deconseille.*allerg/i.test(text);appOnly||=/exclusivement accessible sur l.application/i.test(text);randomSelection||=/algorithme.*combinaison|aleatoir/i.test(text);}
  campaigns.push({...campaign,references,period,prices,termsUrl,allergyWarning,appOnly,randomSelection});
  if(!references.length)warnings.push({url:campaign.url,reason:'Campagne découverte sans référence produit identifiable automatiquement.'});
 }catch(error){throw new Error('Collecte interrompue, aucun catalogue remplacé : '+error.message);}
}
assertCampaignCoverage(campaigns);
const result=normalizeBK(bk,campaigns,date);
const report={checkedAt:date,sources:fetched,campaigns:campaigns.map(({url,references,period,termsUrl,promoted})=>({url,references,period,termsUrl,promoted})),coverage:result.coverage,warnings};
await fs.writeFile(new URL('data/bk-generated.json',root),JSON.stringify(result.entries,null,2)+'\n');
await fs.mkdir(new URL('research/',root),{recursive:true});await fs.writeFile(new URL('research/bk-catalog.json',root),JSON.stringify(bk,null,2)+'\n');
await fs.writeFile(new URL('data/bk-import-report.json',root),JSON.stringify(report,null,2)+'\n');
const previous=JSON.parse(await fs.readFile(new URL('public/data/products.json',root),'utf8'));
const editions=JSON.parse(await fs.readFile(new URL('data/editions.json',root),'utf8'));
await writeCatalogue(fileURLToPath(root),mergeBK(previous,result.entries,editions));
console.log(JSON.stringify({coverage:result.coverage,campaigns:campaigns.length,linkedCampaigns:campaigns.filter(c=>c.references.length).length,warnings:warnings.length},null,2));
