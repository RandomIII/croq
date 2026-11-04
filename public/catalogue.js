// Logique pure partagée avec les tests. Aucun classement ou avis fictif.
import {isArchived,isOffer,parisClock} from './availability.js';
export const brands = {mcdonalds:'McDonald’s',burgerking:'Burger King',quick:'Quick',kfc:'KFC'};
export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function productIdentity(p){
  // Les formats produit/menu peuvent désigner une même référence oubliée.
  // On garde les mots de recette, tailles et « + » pour distinguer les variantes.
  const name=(p.name||'').replace(/[®™]/g,'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\+/g,' plus ').replace(/&/g,' et ').replace(/[^a-z0-9]+/g,' ').trim();
  return p.brand&&name?p.brand+':'+name:null;
}
export function visibleCatalogue(products,now=new Date()){
  const today=parisClock(now).date;
  const available=new Set(products.filter(p=>!isArchived(p,now)&&p.temporal?.status!=='uncertain'&&(!p.temporal?.startsOn||p.temporal.startsOn<=today)).map(productIdentity).filter(Boolean));
  // La source et les avis restent intacts. Seul le doublon non daté est masqué.
  return products.filter(p=>!(isArchived(p,now)&&p.temporal?.certainty==='unconfirmed'&&available.has(productIdentity(p))));
}
export function filterProducts(products, state, ratings={}, now=new Date()) {
  const query=(state.query||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  const result=visibleCatalogue(products,now).filter(p=>{
    const text=[p.name,p.description,brands[p.brand],p.category,...(p.searchTerms||[])].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
    const archived=isArchived(p,now),mode=state.mode||'carte';
    const modeOK=mode==='souvenirs'?archived:mode==='offres'?!archived&&isOffer(p):!archived;
    const dayOK=!state.day||state.day==='all'||!p.schedule?.weekdays?.length||p.schedule.weekdays.includes(Number(state.day));
    const yearOK=!state.year||state.year==='all'||(state.year==='unknown'?!p.editionYear:Number(p.editionYear)===Number(state.year));
    return modeOK&&dayOK&&yearOK&&(state.brand==='all'||p.brand===state.brand)&&(state.category==='all'||p.category===state.category)&&(!state.onlyNew||p.isNew)&&(!state.onlyFavorites||state.favorites.includes(p.id))&&text.includes(query);
  });
  return result.sort((a,b)=>{
    if(state.sort==='name') return a.name.localeCompare(b.name,'fr');
    if(state.sort==='price') return (a.price?.solo??Infinity)-(b.price?.solo??Infinity);
    if(state.sort==='rating') return (ratings[b.id]?.average||0)-(ratings[a.id]?.average||0)||(ratings[b.id]?.count||0)-(ratings[a.id]?.count||0);
    if(state.sort==='reviews') return (ratings[b.id]?.count||0)-(ratings[a.id]?.count||0);
    return (a.order??100)-(b.order??100);
  });
}
export function validateReview(rating,body) {
  if(!Number.isInteger(rating)||rating<1||rating>5) return 'Choisis une note entre 1 et 5 étoiles.';
  if(body.trim().length<20) return 'Raconte ton expérience en au moins 20 caractères.';
  if(body.trim().length>2000) return 'Ton avis ne doit pas dépasser 2 000 caractères.';
  return null;
}
export function formatPrice(value,indicative=false) {return typeof value==='number'?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(value)+(indicative?'*':''):'À vérifier';}
