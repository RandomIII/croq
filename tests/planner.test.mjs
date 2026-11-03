import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildWeek} from '../public/planner.js';
const products=JSON.parse(fs.readFileSync(new URL('../public/data/products.json',import.meta.url)));
test('Le planning associe chaque jour aux vrais menus et sépare les rendez-vous quotidiens',()=>{
 const week=buildWeek(products,new Date('2026-11-03T12:00:00Z'));
 assert.equal(week.days.length,7);assert.equal(week.days[0].date,'2026-11-02');assert.equal(week.days[6].date,'2026-11-08');
 assert.equal(week.days[1].groups[0].title,'Crazy mardi');assert.equal(week.days[1].groups[0].products.length,3);
 assert.equal(week.days[2].groups[0].title,'Mercredeal');assert.equal(week.days[2].groups[0].products.length,2);
 assert.equal(week.days[6].groups[0].title,'Poulet du dimanche');assert.equal(week.days[6].groups[0].products.length,3);
 assert.equal(week.everyday.length,1);assert.equal(week.everyday[0].id,'bk-baby-churros-2026');
 assert.ok(week.days.filter(d=>[1,4,5,6].includes(d.weekday)).every(d=>d.groups.length===0));
});
test('Une offre bornée ne déborde pas sur une autre date et les archives restent exclues',()=>{
 const base={brand:'kfc',schedule:{weekdays:[2,3]}};
 const week=buildWeek([{...base,id:'bounded',temporal:{startsOn:'2026-11-04',endsOn:'2026-11-04'}},{...base,id:'archived',temporal:{status:'archived'}},{...base,id:'uncertain',temporal:{status:'uncertain'}}],new Date('2026-11-03T12:00:00Z'));
 assert.equal(week.days[1].groups.length,0);assert.deepEqual(week.days[2].groups[0].products.map(p=>p.id),['bounded']);
});
test('La semaine suit Paris et affiche les deux mois lors d’un changement de mois',()=>{
 const sunday=buildWeek([],new Date('2026-10-31T23:30:00Z'));assert.equal(sunday.days[6].today,true);assert.match(sunday.label,/26 octobre.*1 novembre 2026/);
 const monday=buildWeek([],new Date('2026-11-01T23:30:00Z'));assert.equal(monday.days[0].date,'2026-11-02');assert.equal(monday.days[0].today,true);
});
