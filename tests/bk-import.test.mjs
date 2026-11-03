import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {flightRecords,publicCampaigns,campaignPeriod,campaignPrices,campaignReferences,normalizeBK,assertCampaignCoverage} from '../tools/bk-source.mjs';
import {filterProducts} from '../public/catalogue.js';
import {availability} from '../public/availability.js';
import {mergeBK} from '../tools/catalogue-output.mjs';
const state={mode:'carte',brand:'all',category:'all',query:'',sort:'selection',favorites:[]};
const html=stream=>'<script>self.__next_f.push('+JSON.stringify([1,stream])+')</script>';
const fixture=()=>({allergens:{},products:{classic:{id:'classic',name:'Le classique',routeId:'classic',image:'https://example.org/classic',type:'BURGER'},old:{id:'old',name:'Ancienne recette',routeId:'old',type:'BURGER'},component:{id:'component',name:'Formule surprise d’hiver',routeId:'component'}},menus:{offer:{id:'offer',name:'Formule surprise d’hiver',routeId:'surprise-hiver',description:'To complete',content:{mains:{ids:['component']}}},newMenu:{id:'newMenu',name:'Menu saisonnier',routeId:'saison'}},menusByRoute:{'surprise-hiver':'offer'},productsByRoute:{},categories:{news:{id:'news',routeId:'nouveautes',inHeaders:true,items:{newMenu:'MENU'}},burgers:{id:'burgers',routeId:'burgers',inHeaders:true,items:{classic:'PRODUCT'}}}});

test('Les blocs texte Flight en octets ne masquent plus les campagnes après du HTML multiligne',()=>{
 const text='Édition éphémère\n<p>Un contenu français.</p>',payload={marketingAnimations:{primary:[{actionEnabled:false,actionUrl:'/page/surprise-hiver',title:'PRIMAIRE 1 - Formule surprise d’hiver'}]}};
 const source=html(':HL["style.css","style"]\na:T'+Buffer.byteLength(text).toString(16)+','+text+'b:'+JSON.stringify(payload)+'\n');
 assert.equal(flightRecords(source).get('a'),text);assert.equal(publicCampaigns(source)[0].url,'https://www.burgerking.fr/page/surprise-hiver');
});
test('Une campagne hors rayon retrouve sa formule, et un MENU des nouveautés est bien importé',()=>{
 const bk=fixture(),campaign={url:'https://www.burgerking.fr/page/surprise-hiver',titles:['Formule surprise d’hiver']};
 const refs=campaignReferences(bk,campaign,'<h1>Une opération</h1>');assert.deepEqual(refs,[{kind:'MENU',id:'offer'}]);
 const result=normalizeBK(bk,[{...campaign,references:refs,period:{startsOn:'2026-11-03',endsOn:'2026-11-23'},prices:[{name:'Formule surprise d’hiver',amount:10},{name:'Formule surprise d’hiver + Boisson',amount:12.5}]}],'2026-11-03');
 assert.equal(result.entries.length,5);assert.equal(result.entries.find(p=>p.id==='bk-menu-newMenu').isNew,true);
 const offer=result.entries.find(p=>p.id==='bk-menu-offer');assert.equal(offer.importEvidence,'campaign');assert.equal(offer.price.menu,12.5);assert.equal(offer.description.includes('To complete'),false);
 assert.equal(offer.temporal.endsOn,'2026-11-23');assert.equal(offer.allergens,null);
 assert.ok(filterProducts(result.entries,state,{},new Date('2026-11-03T12:00Z')).some(p=>p.id===offer.id));
 assert.ok(filterProducts(result.entries,{...state,mode:'souvenirs'},{},new Date('2026-11-24T12:00Z')).some(p=>p.id===offer.id));
 const old=result.entries.find(p=>p.id==='bk-old');assert.equal(old.temporal.certainty,'unconfirmed');assert.equal(availability(old).label,'À dater');
 assert.ok(filterProducts(result.entries,{...state,mode:'souvenirs',year:'unknown'}).some(p=>p.id===old.id));
});
test('Les périodes portent sur l’offre et non sur la validité d’un code ; les prix restent rattachés aux variantes',()=>{
 const legal='<p>L’Opération se déroulera du 12 décembre au 8 janvier 2027.</p><ul><li>La formule au prix de (10&nbsp;€ TTC) (ci-après la « Formule surprise »).</li><li>Avec boisson, (12.50 € TTC) (ci-après la « Formule surprise + Boisson »).</li></ul>';
 assert.deepEqual(campaignPeriod(legal),{startsOn:'2026-12-12',endsOn:'2027-01-08'});assert.equal(campaignPrices(legal)[1].amount,12.5);
 assert.equal(campaignPeriod('<p>Le code est valable du 3 novembre au 23 novembre 2026.</p>'),null);
});
test('La collecte conserve chaque référence et son audit distingue carte et références non datées',()=>{
 const generated=JSON.parse(fs.readFileSync(new URL('../data/bk-generated.json',import.meta.url))),report=JSON.parse(fs.readFileSync(new URL('../data/bk-import-report.json',import.meta.url)));
 assert.equal(generated.length,report.coverage.PRODUCT.total+report.coverage.MENU.total);
 assert.equal(new Set(generated.map(p=>p.id)).size,generated.length);
 for(const c of Object.values(report.coverage))assert.equal(c.current+c.unconfirmed+c.datedArchive,c.total);
 const current=new Set(filterProducts(generated,state).map(p=>p.id));
 for(const p of generated.filter(p=>p.temporal?.certainty==='unconfirmed'))assert.equal(current.has(p.id),false);
});
test('Un rafraîchissement BK préserve les autres enseignes, les identifiants et les dates historiques connues',()=>{
 const mc={id:'mc-test',brand:'mcdonalds',name:'Un classique'},old={id:'bk-old',brand:'burgerking',temporal:{startsOn:'2025-01-01',endsOn:'2025-01-31'}},missing={id:'bk-missing',brand:'burgerking'};
 const merged=mergeBK([mc,old,missing],[{id:old.id,brand:'burgerking',temporal:{status:'archived',certainty:'unconfirmed'}}]);
 assert.deepEqual(merged.find(p=>p.id===mc.id),mc);assert.equal(merged.find(p=>p.id===old.id).temporal.endsOn,'2025-01-31');assert.equal(merged.find(p=>p.id===missing.id).temporal.certainty,'unconfirmed');
 const curated={id:missing.id,brand:'burgerking',availability:'listed',schedule:{weekdays:[3]}};
 assert.equal(mergeBK(merged,[],[curated]).find(p=>p.id===missing.id).temporal,undefined);
});
test('Une campagne principale non reconnue arrête l’import au lieu de disparaître silencieusement',()=>{
 assert.throws(()=>assertCampaignCoverage([{promoted:true,url:'https://www.burgerking.fr/page/nouvelle-operation',references:[]}]),/omission silencieuse/);
 assert.doesNotThrow(()=>assertCampaignCoverage([{promoted:false,references:[]}]));
});
