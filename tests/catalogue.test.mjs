import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterProducts,escapeHtml,validateReview,formatPrice} from '../public/catalogue.js';
const products=JSON.parse(fs.readFileSync(new URL('../public/data/products.json',import.meta.url)));
const state={brand:'all',category:'all',query:'',sort:'selection',onlyNew:false,onlyFavorites:false,favorites:[]};
test('Catalogue : identifiants uniques et quatre enseignes',()=>{
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 assert.deepEqual([...new Set(products.map(p=>p.brand))].sort(),['burgerking','kfc','mcdonalds','quick']);
 for(const p of products){assert.ok(p.name&&p.image&&p.checkedAt);assert.equal(new URL(p.source).protocol,'https:');assert.ok(p.allergens===null||Array.isArray(p.allergens));}
});
test('Les filtres se combinent et les recherches ignorent accents et casse',()=>{
 const found=filterProducts(products,{...state,brand:'burgerking',category:'Burgers',query:'whopper'});
 assert.ok(found.length>0);assert.ok(found.every(p=>p.brand==='burgerking'&&p.category==='Burgers'));
 const fixture=[{id:'a',name:'Café',brand:'mcdonalds',category:'Boissons'}];assert.equal(filterProducts(fixture,{...state,query:'CAFE'}).length,1);
});
test('Favoris et nouveautés ne montrent que les produits attendus',()=>{
 const favorite=products[0].id;assert.deepEqual(filterProducts(products,{...state,onlyFavorites:true,favorites:[favorite]}).map(p=>p.id),[favorite]);
 assert.ok(filterProducts(products,{...state,onlyNew:true}).every(p=>p.isNew));
});
test('McDo : la carte contient aussi les classiques en dehors des nouveautés',()=>{
 const mc={...state,brand:'mcdonalds',category:'Burgers'};
 const full=filterProducts(products,mc);
 const news=filterProducts(products,{...mc,onlyNew:true});
 assert.ok(full.length>news.length);
 for(const id of ['mc-big-mac','mc-cbo','mc-mcchicken','mc-royal-cheese'])assert.ok(full.some(p=>p.id===id),id);
 assert.ok(full.some(p=>p.id==='mc-big-tasty-1-steak-hache'));
});
test('Tri des prix : les prix inconnus arrivent en dernier',()=>{
 const fixture=[{id:'a',price:{solo:null}},{id:'b',price:{solo:8}},{id:'c',price:{solo:5}}].map(p=>({...p,name:p.id,brand:'quick',category:'Burgers'}));
 assert.deepEqual(filterProducts(fixture,{...state,sort:'price'}).map(p=>p.id),['c','b','a']);assert.equal(formatPrice(null),'À vérifier');
});
test('Les classements utilisent les vrais avis et départagent par le nombre',()=>{
 const fixture=products.slice(0,3),[a,b,c]=fixture.map(p=>p.id);
 const rating={[a]:{average:4,count:1},[b]:{average:4,count:8},[c]:{average:3,count:100}};
 assert.equal(filterProducts(fixture,{...state,sort:'rating'},rating)[0].id,b);
 assert.equal(filterProducts(fixture,{...state,sort:'reviews'},rating)[0].id,c);
});
test('La validation refuse les notes hors limites et les faux avis trop courts',()=>{
 assert.ok(validateReview(0,'Un avis bien assez long pour être accepté.'));
 assert.ok(validateReview(2.5,'Un avis bien assez long pour être accepté.'));
 assert.ok(validateReview(4,'Bon'));
 assert.ok(validateReview(4,'a'.repeat(2001)));
 assert.equal(validateReview(4,'Vraiment bon, une belle texture et une sauce équilibrée.'),null);
});
test('Les textes des avis sont échappés avant affichage',()=>{
 assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 assert.equal(escapeHtml("L'avis & le goût"),'L&#39;avis &amp; le goût');
});
test('Aucun avis, tarif national inventé ou tiret quadratin',()=>{
 for(const p of products){assert.ok(!('rating' in p)&&!('reviews' in p));assert.ok(!JSON.stringify(p).includes('\u2014'));if(p.price.solo!==null||p.price.menu!==null)assert.ok(p.price.source&&p.price.checkedAt&&p.price.restaurant);}
});
