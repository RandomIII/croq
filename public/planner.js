import {parisClock,WEEKDAYS} from './availability.js';

// Les rendez-vous ne sont montrés que sur les dates couvertes par leurs conditions.
function covers(p,date){const t=p.temporal||{};return p.schedule&&t.status!=='archived'&&t.status!=='uncertain'&&(!t.startsOn||t.startsOn<=date)&&(!t.endsOn||t.endsOn>=date);}
export function buildWeek(products,now=new Date()){
 const clock=parisClock(now),monday=new Date(clock.date+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-clock.weekday+1);
 const days=WEEKDAYS.map((label,index)=>{
  const date=new Date(monday);date.setUTCDate(date.getUTCDate()+index);const iso=date.toISOString().slice(0,10),groups=new Map();
  for(const p of products.filter(p=>covers(p,iso)&&p.schedule.weekdays?.includes(index+1)&&p.schedule.weekdays.length<7)){
   const key=p.brand+':'+(p.schedule.campaign||p.id);
   if(!groups.has(key))groups.set(key,{brand:p.brand,title:p.schedule.campaignTitle||p.name,products:[]});
   groups.get(key).products.push(p);
  }
  return {weekday:index+1,label,date:iso,dayNumber:date.getUTCDate(),today:iso===clock.date,past:iso<clock.date,groups:[...groups.values()]};
 });
 const start=days[0].date.slice(0,7)===days[6].date.slice(0,7)?days[0].dayNumber:new Date(days[0].date+'T12:00:00Z').toLocaleDateString('fr-FR',{day:'numeric',month:'long',...(days[0].date.slice(0,4)!==days[6].date.slice(0,4)?{year:'numeric'}:{}),timeZone:'Europe/Paris'});
 return {days,everyday:products.filter(p=>covers(p,clock.date)&&p.schedule.weekdays?.length===7),label:`Semaine du ${start} au ${new Date(days[6].date+'T12:00:00Z').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'})}`};
}
