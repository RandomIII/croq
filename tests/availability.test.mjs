import test from 'node:test';
import assert from 'node:assert/strict';
import {availability,isArchived,parisClock} from '../public/availability.js';
import {filterProducts} from '../public/catalogue.js';
import fs from 'node:fs';
const tuesday=new Date('2026-11-03T12:00:00Z');
const base={brand:'burgerking',category:'Menus',description:'',name:'Menu',price:{solo:null,menu:null}};
const weekly={...base,id:'weekly',recordType:'offer',schedule:{weekdays:[3]}};
const old={...base,id:'old',editionYear:2024,temporal:{startsOn:'2024-04-09',endsOn:'2024-05-27'}};
const state={brand:'all',category:'all',query:'',sort:'selection',onlyNew:false,onlyFavorites:false,favorites:[]};
test('Une offre du mercredi ne devient pas disponible le mardi',()=>{
 assert.equal(availability(weekly,tuesday).kind,'scheduled');
 assert.equal(availability(weekly,new Date('2026-11-04T12:00:00Z')).kind,'scheduled-open');
});
test('Le jour est calculé à Paris, y compris après minuit et en heure été',()=>{
 assert.equal(parisClock(new Date('2026-11-03T23:30:00Z')).weekday,3);
 assert.equal(parisClock(new Date('2026-07-07T22:30:00Z')).weekday,3);
});
test('Une date de fin est inclusive, puis la fiche passe dans les souvenirs',()=>{
 assert.equal(isArchived(old,new Date('2024-05-27T12:00:00Z')),false);
 assert.equal(isArchived(old,new Date('2024-05-27T22:30:00Z')),true);
 assert.deepEqual(filterProducts([weekly,old],{...state,mode:'carte'},{},tuesday).map(p=>p.id),['weekly']);
 assert.deepEqual(filterProducts([weekly,old],{...state,mode:'souvenirs'},{},tuesday).map(p=>p.id),['old']);
});
test('Les créneaux horaires ont une fin exclusive et ne garantissent pas le stock',()=>{
 const p={...base,schedule:{timeWindows:[['14:00','18:00']]}};
 assert.equal(availability(p,new Date('2026-11-03T13:00:00Z')).kind,'scheduled-open');
 assert.equal(availability(p,new Date('2026-11-03T17:00:00Z')).kind,'scheduled');
});
test('Les filtres jour et année se combinent sans transformer les archives en offres',()=>{
 assert.equal(filterProducts([weekly],{...state,mode:'offres',day:'2'},{},tuesday).length,0);
 assert.equal(filterProducts([weekly],{...state,mode:'offres',day:'3'},{},tuesday).length,1);
 assert.equal(filterProducts([old],{...state,mode:'souvenirs',year:'2025'},{},tuesday).length,0);
 assert.equal(filterProducts([old],{...state,mode:'souvenirs',year:'2024'},{},tuesday).length,1);
});
test('Une édition conservée avec une fin inconnue reste archivée sans inventer de date',()=>{
 const p={...base,temporal:{status:'archived',periodLabel:'Janvier 2025'}};
 assert.equal(availability(p,tuesday).kind,'archived');
 assert.equal(p.temporal.endsOn,undefined);
});
test('Crazy mardi retrouve les trois Tuesday Deals, jamais les anciennes promotions',()=>{
 const products=JSON.parse(fs.readFileSync(new URL('../public/data/products.json',import.meta.url)));
 const found=filterProducts(products,{...state,mode:'offres',query:'crazy mardi'},{},tuesday);
 assert.equal(found.length,3);assert.ok(found.every(p=>p.brand==='kfc'&&p.schedule.weekdays.includes(2)));
 const archives=filterProducts(products,{...state,mode:'souvenirs'},{},tuesday);
 assert.ok(archives.some(p=>p.id==='bk-naruto-2025'));
 assert.ok(archives.some(p=>p.id==='kfc-boxmaster-3-euros-2026'));
 assert.ok(!filterProducts(products,state,{},tuesday).some(p=>p.id==='kfc-boxmaster-3-euros-2026'));
});
