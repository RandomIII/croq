// Tous les jours et horaires sont interprétés en France, pas selon le navigateur.
export const WEEKDAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
export function parisClock(now=new Date()) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 const date=`${parts.year}-${parts.month}-${parts.day}`;
 return {date,weekday:new Date(date+'T12:00:00Z').getUTCDay()||7,time:`${parts.hour}:${parts.minute}`,year:Number(parts.year)};
}
export function isArchived(p,now=new Date()) {
 return p.temporal?.status==='archived'||Boolean(p.temporal?.endsOn&&p.temporal.endsOn<parisClock(now).date);
}
export function isOffer(p) {return p.recordType==='offer'||Boolean(p.schedule)||Boolean(p.temporal?.endsOn)||Boolean(p.isNew);}
export function scheduleLabel(p) {
 const days=p.schedule?.weekdays||[];
 const label=days.length===7?'Tous les jours':days.map(d=>WEEKDAYS[d-1]).join(' · ');
 const hours=(p.schedule?.timeWindows||[]).map(([start,end])=>`${start} à ${end}`).join(' et ');
 return [label,hours].filter(Boolean).join(' · ');
}
export function availability(p,now=new Date()) {
 const clock=parisClock(now),t=p.temporal||{};
 if(isArchived(p,now)&&t.certainty==='unconfirmed')return {kind:'archive-unverified',label:'À dater',detail:t.archiveNote};
 if(isArchived(p,now))return {kind:'archived',label:'Édition archivée',detail:t.archiveNote||'Cette édition est conservée pour les souvenirs. Elle ne fait pas partie de la carte du moment.'};
 if(t.startsOn&&t.startsOn>clock.date)return {kind:'upcoming',label:'À venir',detail:`Début annoncé le ${dateLabel(t.startsOn)}.`};
 if(p.schedule){
  const dayOK=!p.schedule.weekdays?.length||p.schedule.weekdays.includes(clock.weekday);
  const timeOK=!p.schedule.timeWindows?.length||p.schedule.timeWindows.some(([start,end])=>clock.time>=start&&clock.time<end);
  return {kind:dayOK&&timeOK?'scheduled-open':'scheduled',label:dayOK&&timeOK?'Au programme aujourd’hui':scheduleLabel(p),detail:`${scheduleLabel(p)}. ${p.schedule.conditions||'Dans les restaurants participants, selon les horaires et les stocks.'}`};
 }
 if(t.status==='uncertain')return {kind:'uncertain',label:'À confirmer',detail:t.note||'Les conditions actuelles de cette offre restent à vérifier.'};
 if(t.endsOn||p.isNew)return {kind:'limited',label:'Édition limitée',detail:t.endsOn?`Offre annoncée jusqu’au ${dateLabel(t.endsOn)} inclus, selon les stocks.`:'Édition du moment. La date de fin n’a pas été communiquée dans la source consultée.'};
 return {kind:'current',label:'À la carte',detail:'Référencé sur la carte française lors du dernier relevé. Disponibilité à confirmer dans ton restaurant.'};
}
export function dateLabel(value){return new Date(value+'T12:00:00Z').toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'});}
export function periodLabel(p) {
 const t=p.temporal||{};
 if(t.certainty==='unconfirmed')return 'Période inconnue'+(p.sourceReference?' · réf. '+p.sourceReference.slice(-6):'');
 if(t.startsOn&&t.endsOn)return `Du ${dateLabel(t.startsOn)} au ${dateLabel(t.endsOn)}`;
 return t.periodLabel||(t.startsOn?`Depuis le ${dateLabel(t.startsOn)}`:p.editionYear?`Édition ${p.editionYear}`:'Période non documentée');
}
