import test from 'node:test';
import assert from 'node:assert/strict';
import {filterProducts,visibleCatalogue} from '../public/catalogue.js';
const now=new Date('2026-11-04T12:00:00Z');
const state={mode:'souvenirs',brand:'all',category:'all',query:'',sort:'selection',favorites:[]};
const available={id:'current',brand:'burgerking',name:'BOX MYSTERE™',category:'Menus',recordType:'offer'};
const forgotten={id:'forgotten',brand:'burgerking',name:'Box mystère®',category:'Références',recordType:'product',description:'Un souvenir retrouvé',temporal:{status:'archived',certainty:'unconfirmed'}};

test('La référence oubliée est masquée face au produit disponible, avant les filtres, sans modifier les fiches',()=>{
 const products=[forgotten,available],before=JSON.stringify(products);
 assert.deepEqual(visibleCatalogue(products,now).map(p=>p.id),['current']);
 assert.deepEqual(filterProducts(products,{...state,query:'souvenir',category:'Références',year:'unknown',onlyFavorites:true,favorites:['forgotten']},{},now),[]);
 assert.deepEqual(filterProducts(products,{...state,mode:'carte'},{},now).map(p=>p.id),['current']);
 assert.equal(JSON.stringify(products),before);
});
test('Les autres enseignes, variantes et éditions historiques documentées restent visibles',()=>{
 const otherBrand={...forgotten,id:'other',brand:'quick'},spicy={...forgotten,id:'spicy',name:'Box mystère Spicy'},plus={...forgotten,id:'plus',name:'Box mystère+'},dated={...forgotten,id:'dated',editionYear:2024,temporal:{status:'archived',startsOn:'2024-01-01',endsOn:'2024-02-01'}};
 assert.deepEqual(filterProducts([available,forgotten,otherBrand,spicy,plus,dated],state,{},now).map(p=>p.id),['other','spicy','plus','dated']);
});
test('Une version future, expirée ou incertaine ne masque pas la référence oubliée',()=>{
 for(const temporal of [{startsOn:'2026-11-05'},{endsOn:'2026-11-03'},{status:'uncertain'}])assert.ok(visibleCatalogue([forgotten,{...available,temporal}],now).some(p=>p.id==='forgotten'));
 const lastDay={...available,temporal:{startsOn:'2026-11-01',endsOn:'2026-11-04'}};
 assert.equal(visibleCatalogue([forgotten,lastDay],now).some(p=>p.id==='forgotten'),false);
 assert.equal(visibleCatalogue([forgotten,lastDay],new Date('2026-11-04T23:30:00Z')).some(p=>p.id==='forgotten'),true);
});
