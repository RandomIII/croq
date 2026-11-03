import {brands,escapeHtml as e,filterProducts,validateReview,formatPrice} from './catalogue.js';
import * as api from './backend.js';
import {availability,isArchived,isOffer,periodLabel,parisClock,WEEKDAYS} from './availability.js';
const $=s=>document.querySelector(s);
let products=[],ratings={},user=null,activeProduct=null,activeTab='description',reviewStars=0,reviewCache=[],toastTimer;
function readStorage(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
const state={mode:'carte',day:'all',year:'all',brand:'all',category:'all',query:'',sort:'selection',onlyNew:false,onlyFavorites:false,favorites:readStorage('croq-favorites',[]),limit:12};
let calendarDay=parisClock().weekday;
if(!Array.isArray(state.favorites))state.favorites=[];
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
function info(title,html){$('#info-title').textContent=title;$('#info-body').innerHTML=html;$('#info-dialog').showModal();}
function safeImage(url){try{const u=new URL(url,location.href);return ['http:','https:'].includes(u.protocol)?e(u.href):'./placeholder.svg';}catch{return './placeholder.svg';}}
function imageMarkup(p,extra=''){return `<img src="${safeImage(p.image||'./placeholder.svg')}" alt="${e(p.name)}" ${extra}>`;}
document.addEventListener('error',event=>{if(event.target.tagName==='IMG'&&!event.target.dataset.fallback){event.target.dataset.fallback='1';event.target.src='./placeholder.svg';event.target.alt+=' (photo indisponible)';}},true);
function ratingMarkup(p){const r=ratings[p.id];return r?.count?`<span class="stars" aria-hidden="true">${'★'.repeat(Math.round(r.average))}${'☆'.repeat(5-Math.round(r.average))}</span><b>${r.average.toFixed(1).replace('.',',')}</b><span>(${r.count} avis)</span>`:'<span class="no-review">☆ Sois le premier à donner ton avis</span>';}
function card(p){const a=availability(p),old=isArchived(p);return `<article class="product-card"><button class="save" data-save="${e(p.id)}" aria-label="${state.favorites.includes(p.id)?'Retirer des':'Ajouter aux'} favoris : ${e(p.name)}" aria-pressed="${state.favorites.includes(p.id)}">${state.favorites.includes(p.id)?'♥':'♡'}</button><button class="product-open" data-product="${e(p.id)}" aria-label="Voir ${e(p.name)}"><div class="product-photo">${a.kind!=='current'?`<span class="availability-badge ${e(a.kind)}">${e(a.label)}</span>`:''}${imageMarkup(p,'loading="lazy" decoding="async"')}</div><div class="product-copy"><div class="brand-label"><span class="brand-dot"></span>${brands[p.brand]} · ${e(p.category)}</div><h3>${e(p.name)}</h3>${old?`<span class="edition-period">${e(periodLabel(p))}</span>`:''}<p class="short-desc">${e(p.description)}</p><div class="rating-line">${ratingMarkup(p)}</div></div></button><div class="price-row"><span>${old?'Seul à l’époque':'Produit seul'}<b class="${p.price?.solo==null?'price-missing':''}">${formatPrice(p.price?.solo,p.price?.kind==='catalogue')}</b></span><span>${old?'Menu à l’époque':'En menu'}<b class="${p.price?.menu==null?'price-missing':''}">${formatPrice(p.price?.menu,p.price?.kind==='catalogue')}</b></span></div></article>`;}
function renderCalendar(){
 const today=parisClock().weekday;
 $('#rendez-vous h2 em').textContent=WEEKDAYS[calendarDay-1].toLowerCase()+' ?';
 const offers=products.filter(p=>!isArchived(p)&&p.schedule?.weekdays?.includes(calendarDay));
 $('#week-days').innerHTML=WEEKDAYS.map((day,i)=>`<button data-calendar-day="${i+1}" class="${calendarDay===i+1?'selected ':''}${today===i+1?'today':''}" aria-pressed="${calendarDay===i+1}"><strong>${day}</strong><small>${today===i+1?'Aujourd’hui':i===1?'Crazy mardi':i===2?'Mercredeal':i===6?'Poulet BK':'Les petits plans'}</small></button>`).join('');
 $('#weekly-offers').innerHTML=offers.length?offers.map(p=>`<button class="weekly-card" data-product="${e(p.id)}"><div><small>${brands[p.brand]} · ${WEEKDAYS[calendarDay-1]}</small><h3>${e(p.name)}</h3><p>${e(p.schedule.timeWindows?'Créneaux horaires et conditions dans la fiche.':p.schedule.conditions)}</p><span class="weekly-price">${p.price?.solo!=null||p.price?.menu!=null?formatPrice(p.price.solo??p.price.menu):'Voir les conditions'} ↗</span></div>${imageMarkup(p,'loading="lazy"')}</button>`).join(''):'<p>Aucune autre offre vérifiée pour ce jour. Le calendrier s’enrichit avec les sources des enseignes.</p>';
}
function renderCollections(){
 for(const mode of ['carte','offres','souvenirs'])$('#count-'+mode).textContent=products.filter(p=>mode==='souvenirs'?isArchived(p):mode==='offres'?!isArchived(p)&&isOffer(p):!isArchived(p)).length;
 $('#all-count').textContent=$('#count-'+state.mode).textContent;
 document.querySelectorAll('.catalogue-modes [data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode);});
 $('#collection-context').textContent=state.mode==='souvenirs'?'Les anciennes éditions restent ici, avec leurs avis. Dates et tarifs sont historiques. Une date de fin inconnue reste indiquée comme telle.':state.mode==='offres'?'Les rendez-vous de la semaine, les promotions et les éditions du moment. Ouvre une fiche pour connaître les horaires, coupons et conditions.':'La carte relevée en France, menus compris. Les anciennes éditions se retrouvent dans la boîte à souvenirs.';
 $('#temporal-filters').innerHTML=state.mode==='souvenirs'?['all',...new Set(products.filter(p=>isArchived(p)).map(p=>p.editionYear).filter(Boolean).sort((a,b)=>b-a))].map(y=>`<button data-year="${y}" class="${String(state.year)===String(y)?'active':''}" aria-pressed="${String(state.year)===String(y)}">${y==='all'?'Toutes les années':y}</button>`).join(''):state.mode==='offres'?['all',1,2,3,4,5,6,7].map(d=>`<button data-day="${d}" class="${String(state.day)===String(d)?'active':''}" aria-pressed="${String(state.day)===String(d)}">${d==='all'?'Tous les jours':WEEKDAYS[d-1]}</button>`).join(''):'';
}
function render(){
 renderCollections();
 const found=filterProducts(products,state,ratings);
 $('#product-grid').innerHTML=found.length?found.slice(0,state.limit).map(card).join(''):`<div class="empty"><b>Rien à se mettre sous la dent.</b><p>${state.onlyFavorites?'Ajoute des produits à tes favoris avec le cœur.':'Essaie un autre mot ou retire un filtre.'}</p><button class="outline" id="reset-filters">Réinitialiser les filtres</button></div>`;
 $('#product-grid').setAttribute('aria-busy','false');
 $('#results-count').textContent=`${found.length} fiche${found.length>1?'s':''}${state.mode==='souvenirs'?' souvenir':state.mode==='offres'?' d’offres et éditions':''}${state.onlyNew?' en ce moment':''}${state.onlyFavorites?' dans tes favoris':''}`;
 $('#active-filters').hidden=!state.onlyNew;
 $('#active-filters').innerHTML=state.onlyNew?'<span>Filtre actif :</span><button id="remove-new" aria-label="Retirer le filtre nouveautés">Nouveautés uniquement ✕</button>':'';
 $('#load-more-wrap').hidden=found.length<=state.limit;
 document.querySelectorAll('[data-brand]').forEach(b=>{b.classList.toggle('selected',b.dataset.brand===state.brand);b.setAttribute('aria-pressed',b.dataset.brand===state.brand);});
 document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category===state.category);b.setAttribute('aria-pressed',b.dataset.category===state.category);});
 $('#favorites-filter').setAttribute('aria-pressed',state.onlyFavorites);
 $('#sort').value=state.sort;
}
function update(change){Object.assign(state,change,{limit:12});render();}
function sourceMarkup(p){return `<p class="source">Source documentaire : <a href="${e(p.source)}" target="_blank" rel="noopener noreferrer">${e(new URL(p.source).hostname)} ↗</a> · Vérifiée le ${new Date(p.checkedAt+'T12:00:00').toLocaleDateString('fr-FR')}. ${isArchived(p)?'Source d’une édition passée.':'Disponibilité locale à confirmer.'}</p>`;}
async function openProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 activeProduct=p;activeTab='description';reviewStars=0;reviewCache=[];
 $('#product-detail').innerHTML=`<div class="detail-top"><div class="detail-image">${imageMarkup(p)}</div><div class="detail-intro"><div class="brand-label">${brands[p.brand]} · ${e(p.category)} ${p.isNew?'· En ce moment':''}</div><h2 id="product-title">${e(p.name)}</h2><div class="rating-line">${ratingMarkup(p)}</div><div class="detail-prices"><div><small>Produit seul</small><strong>${formatPrice(p.price?.solo,p.price?.kind==='catalogue')}</strong></div><div><small>En menu</small><strong>${formatPrice(p.price?.menu,p.price?.kind==='catalogue')}</strong></div></div><p>${e(p.price?.note||'Pas de tarif national confirmé. Consulte le restaurant de ton choix pour le prix du produit et de son menu.')}</p></div></div><div class="detail-tabs" role="tablist" aria-label="Informations produit"><button id="tab-description" role="tab" data-tab="description" aria-controls="detail-panel">La recette</button><button id="tab-allergens" role="tab" data-tab="allergens" aria-controls="detail-panel">Allergènes & nutrition</button><button id="tab-reviews" role="tab" data-tab="reviews" aria-controls="detail-panel">Les vrais avis</button></div><div id="detail-panel" class="detail-body" role="tabpanel"></div>`;
 const a=availability(p),intro=$('.detail-intro');
 intro.querySelector('.brand-label').textContent=`${brands[p.brand]} · ${p.category}`;
 intro.insertAdjacentHTML('beforeend',`<div class="status-panel ${e(a.kind)}"><strong>${e(a.label)}</strong>${p.temporal?`<p>${e(periodLabel(p))}</p>`:''}<p>${e(a.detail)}</p></div>`);
 if(isArchived(p)){intro.querySelectorAll('.detail-prices small')[0].textContent='Produit seul à l’époque';intro.querySelectorAll('.detail-prices small')[1].textContent='Menu à l’époque';if(!p.price?.note)intro.querySelector('.detail-prices + p').textContent='Aucun tarif historique confirmé dans la source consultée.';}
 if(p.imageCaption)$('.detail-image').insertAdjacentHTML('beforeend',`<p class="image-caption">${e(p.imageCaption)}</p>`);
 renderTab();if(!$('#product-dialog').open)$('#product-dialog').showModal();
}
function renderTab(){
 const p=activeProduct;if(!p)return;
 document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===activeTab;b.classList.toggle('active',active);b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;});
 const panel=$('#detail-panel');panel.setAttribute('aria-labelledby','tab-'+activeTab);
 if((p.allergenNote||isArchived(p))&&activeTab==='allergens')queueMicrotask(()=>{if(activeProduct?.id===p.id&&activeTab==='allergens')panel.insertAdjacentHTML('afterbegin',`<p class="allergy-box">${e(isArchived(p)?'Les informations de cette ancienne édition ne doivent pas être déduites de la recette actuelle. Seules des données historiques vérifiées peuvent compléter cette fiche.':p.allergenNote)}</p>`);});
 if(activeTab==='description'){
 panel.innerHTML=`<h3>${p.descriptionType==='summary'?'La recette en quelques mots':'La description de l’enseigne'}</h3><p>${e(p.description||'La description complète est disponible sur la fiche officielle ci-dessous. Son relevé reste à compléter.')}</p><h3>Les ingrédients</h3>${p.ingredients?.length?`<div class="chips">${p.ingredients.map(x=>`<span class="chip">${e(x)}</span>`).join('')}</div><p class="form-message">Éléments de recette indiqués par l’enseigne. La composition détaillée reste disponible sur sa fiche officielle.</p>`:'<p>La liste détaillée n’a pas encore été relevée. Retrouve-la sur la fiche officielle ci-dessous.</p>'}${sourceMarkup(p)}`;
 }else if(activeTab==='allergens'){
 panel.innerHTML=`<h3>Allergènes déclarés</h3>${p.allergens!==null?`<div class="chips">${p.allergens.length?p.allergens.map(x=>`<span class="chip">${e(x)}</span>`).join(''):'Aucun allergène déclaré dans les données de la source.'}</div>`:'<p>Liste non vérifiée pour ce produit. Consulte impérativement les informations de l’enseigne.</p>'}${p.traces?.length?`<p><b>Traces possibles :</b> ${p.traces.map(e).join(', ')}.</p>`:''}<div class="allergy-box"><p>Les recettes évoluent et des contaminations croisées sont possibles. En cas d’allergie, confirme toujours les informations auprès du restaurant.</p>${p.allergenSource?`<p><a href="${e(p.allergenSource)}" target="_blank" rel="noopener noreferrer">Consulter le document officiel des allergènes ↗</a></p>`:''}</div><h3>Valeurs nutritionnelles par portion</h3>${p.nutrition?.length?`<table class="nutrition"><tbody>${p.nutrition.map(n=>`<tr><td>${e(n.label)}</td><td>${e(n.value)} ${e(n.unit)}</td></tr>`).join('')}</tbody></table>`:'<p>Valeurs non relevées. Consulte la source officielle pour la portion et la recette de ton choix.</p>'}${sourceMarkup(p)}`;
 }else{panel.innerHTML='<p role="status">Chargement des avis…</p>';renderReviews(p);}
}
async function renderReviews(p){
 try{
  const rows=await api.loadReviews(p.id);if(activeProduct?.id!==p.id||activeTab!=='reviews')return;reviewCache=rows;
  const own=rows.find(x=>x.user_id===user?.id);reviewStars=own?.rating||0;
  $('#detail-panel').innerHTML=`<div class="review-header"><div><h3>Ça vaut le détour ?</h3><div class="rating-line">${ratingMarkup(p)}</div></div><span class="form-message">Un compte Discord, un avis par produit.</span></div>${!api.configured?'<div class="allergy-box"><p>Le catalogue est accessible. La connexion Discord et les avis partagés seront activés après configuration du site.</p></div>':''}${rows.length?rows.map(r=>`<article class="review-item"><div class="review-author"><span class="avatar">${e((r.display_name||'G')[0])}</span><strong>${e(r.display_name||'Gourmand')}</strong><time datetime="${e(r.updated_at)}">${new Date(r.updated_at).toLocaleDateString('fr-FR')}</time></div><p><span class="stars" aria-label="${r.rating} sur 5">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>${r.restaurant?` · ${e(r.restaurant)}`:''}</p><p>${e(r.body)}</p><div class="review-actions">${r.user_id===user?.id?`<button data-delete="${e(r.id)}">Supprimer mon avis</button>`:`<button data-report="${e(r.id)}">Signaler</button>`}</div></article>`).join(''):'<p>Aucun avis pour le moment. Le premier pourrait être le tien.</p>'}${user?`<form class="review-form" id="review-form"><h3>${own?'Modifier ton avis':'À ton tour de goûter'}</h3><div class="star-picker" role="group" aria-label="Ta note sur 5">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" aria-label="${n} étoile${n>1?'s':''}" aria-pressed="${reviewStars===n}" class="${n<=reviewStars?'chosen':''}">★</button>`).join('')}</div><label for="review-restaurant">Restaurant visité (facultatif)<input id="review-restaurant" maxlength="120" value="${e(own?.restaurant||'')}" placeholder="Ex. Quick Lyon Part-Dieu"></label><label for="review-body">Ton expérience<textarea id="review-body" required minlength="20" maxlength="2000" placeholder="Le goût, la texture, le rapport qualité-prix…">${e(own?.body||'')}</textarea></label><p class="form-message">20 à 2 000 caractères. Un avis sincère, respectueux et fondé sur ton expérience.</p><button class="primary" type="submit">${own?'Enregistrer les modifications':'Publier mon avis'} ↗</button><p id="review-error" role="alert"></p></form>`:`<button class="primary" data-login>Se connecter avec Discord pour donner son avis ↗</button>`}`;
 if(isArchived(p)){$('#detail-panel').insertAdjacentHTML('afterbegin','<p class="archive-review-note">Tu l’avais goûté à l’époque ? Partage ton souvenir de cette édition. La date affichée sur l’avis est celle de sa publication.</p>');const title=$('#review-form h3');if(title&&!own)title.textContent='Raconte ton souvenir';}
 }catch{if(activeProduct?.id===p.id&&activeTab==='reviews')$('#detail-panel').innerHTML='<p>Les avis sont momentanément indisponibles.</p><button class="outline" data-retry>Réessayer</button>';}
}
async function connect(){try{await api.login();}catch(err){info('Ton compte gourmand',`<p>${e(err.message)}</p><p>Une fois le service activé, ton identité Discord te permettra de publier, modifier et supprimer tes avis depuis n’importe quel appareil.</p>`);}}
async function authChanged(session){user=session?.user||null;$('#login span').textContent=user?(user.user_metadata.full_name||user.user_metadata.name||'Mon compte'):'Connexion Discord';if(activeTab==='reviews'&&$('#product-dialog').open)renderTab();}
document.addEventListener('click',async event=>{
 const b=event.target.closest('button, a');if(!b)return;
 if(b.dataset.mode){$('#search').value='';update({mode:b.dataset.mode,day:'all',year:'all',brand:'all',category:'all',query:'',onlyNew:false,onlyFavorites:false});return;}
 if(b.dataset.day){update({day:b.dataset.day});return;}
 if(b.dataset.year){update({year:b.dataset.year});return;}
 if(b.dataset.calendarDay){calendarDay=Number(b.dataset.calendarDay);renderCalendar();return;}
 // Les onglets d'enseigne ouvrent la carte complète, même après les nouveautés.
 if(b.dataset.brand){update({brand:b.dataset.brand,onlyNew:false});return;}
 if(b.id==='remove-new'){update({onlyNew:false});return;}
 if(b.dataset.category){update({category:b.dataset.category});return;}
 if(b.dataset.product){openProduct(b.dataset.product);return;}
 if(b.dataset.save){const id=b.dataset.save;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];try{localStorage.setItem('croq-favorites',JSON.stringify(state.favorites));}catch{toast('Le stockage des favoris est bloqué par ton navigateur.');}render();return;}
 if(b.dataset.tab){activeTab=b.dataset.tab;renderTab();return;}
 if(b.hasAttribute('data-login')){connect();return;}
 if(b.dataset.star){reviewStars=Number(b.dataset.star);document.querySelectorAll('[data-star]').forEach(s=>{s.classList.toggle('chosen',Number(s.dataset.star)<=reviewStars);s.setAttribute('aria-pressed',Number(s.dataset.star)===reviewStars);});return;}
 if(b.dataset.delete){if(!confirm('Supprimer définitivement ton avis ?'))return;try{await api.deleteReview(b.dataset.delete);ratings=await api.loadRatings();render();renderTab();toast('Ton avis a été supprimé.');}catch{toast('Impossible de supprimer ton avis. Réessaie.');}return;}
 if(b.dataset.report){try{await api.reportReview(b.dataset.report);toast('Signalement enregistré. Merci.');}catch(err){toast(err.message);}return;}
 if(b.hasAttribute('data-retry')){renderTab();return;}
 if(b.id==='reset-filters'){state.query='';$('#search').value='';update({day:'all',year:'all',brand:'all',category:'all',onlyNew:false,onlyFavorites:false,sort:'selection'});}
});
document.addEventListener('submit',async event=>{
 if(event.target.id!=='review-form')return;event.preventDefault();
 const p=activeProduct,body=$('#review-body').value,restaurant=$('#review-restaurant').value,error=validateReview(reviewStars,body);if(error){$('#review-error').textContent=error;return;}
 const button=event.target.querySelector('[type=submit]');button.disabled=true;
 try{await api.saveReview(p.id,reviewStars,body,restaurant);ratings=await api.loadRatings();render();if(activeProduct?.id===p.id&&activeTab==='reviews')renderTab();toast('Ton avis est enregistré. Merci pour le partage !');}catch(err){if($('#review-error'))$('#review-error').textContent=err.message||'La publication a échoué. Réessaie.';}finally{button.disabled=false;}
});
$('#search').addEventListener('input',ev=>update({query:ev.target.value}));
$('#sort').addEventListener('change',ev=>update({sort:ev.target.value}));
$('#load-more').onclick=()=>{state.limit+=12;render();};
$('#favorites-filter').onclick=()=>update({onlyFavorites:!state.onlyFavorites});
$('#show-new').onclick=()=>{update({mode:'offres',day:'all',year:'all',onlyNew:true,brand:'all',category:'all',onlyFavorites:false,query:''});$('#search').value='';$('#catalogue').scrollIntoView({behavior:'smooth'});toast('Les produits en ce moment sont affichés.');};
$('#ranking-link').onclick=()=>{update({sort:'rating',onlyNew:false,onlyFavorites:false});if(!Object.keys(ratings).length)toast('Le classement prendra vie avec les premiers avis.');};
$('#join').onclick=connect;
$('#login').onclick=()=>{if(!user){connect();return;}info('Ton compte',`<p>Connecté avec Discord sous le nom <b>${e(user.user_metadata.full_name||user.user_metadata.name||'Gourmand')}</b>.</p><p>Retrouve tes avis dans les fiches produits pour les modifier ou les supprimer.</p><button class="outline" id="logout">Me déconnecter</button><p><button class="text-button" id="delete-account">Supprimer mon compte et tous mes avis</button></p>`);$('#logout').onclick=async()=>{const c=await api.getClient();await c.auth.signOut();$('#info-dialog').close();toast('Tu es déconnecté.');};$('#delete-account').onclick=async()=>{if(!confirm('Supprimer définitivement ton compte et tous tes avis ?'))return;try{const c=await api.getClient();const {error}=await c.rpc('delete_my_account');if(error)throw error;await c.auth.signOut();$('#info-dialog').close();toast('Ton compte et tes avis ont été supprimés.');}catch{toast('La suppression a échoué. Réessaie.');}};};
$('#price-info').onclick=()=>info('Le bon prix, au bon endroit',`<p>Il n’existe pas de tarif unique pour toute la France. Le prix dépend du restaurant, de la taille du menu et du canal de commande.</p><p>Les prix marqués d’un astérisque sont les <b>tarifs indicatifs du catalogue public Quick</b>, relevés le 3 novembre 2026. La source ne précise pas le restaurant : ils ne constituent donc pas une promesse de prix dans le tien. Le menu renseigné est de taille M.</p><p>Les montants absents sont indiqués « À vérifier ». Chaque fiche précise le contexte de son relevé. Le catalogue ne garantit pas le stock de chaque restaurant.</p>`);
$('#about').onclick=()=>info('Croq, en toute transparence',`<p>Croq est un guide indépendant des cartes françaises de McDonald’s, Burger King, Quick et KFC. Les noms et photographies appartiennent à leurs titulaires. Les liens officiels figurent dans chaque fiche.</p><h3>Des données traçables</h3><p>Chaque fiche indique sa date de vérification. Le catalogue initial est partiel ; aucune synchronisation en temps réel n’est revendiquée. Une mention « En ce moment » désigne une offre de la carte actuelle, sans garantir sa date de lancement.</p><h3>Tes données</h3><p>Les favoris sont conservés dans ton navigateur. Si tu te connectes avec Discord, Supabase gère la session et conserve ton identifiant, ton nom public et les informations nécessaires à l’authentification. Tes avis, notes et restaurants visités sont publics. Les jetons de session sont stockés dans ton navigateur pour maintenir ta connexion.</p><p>Tu peux supprimer tes avis depuis leur fiche et ton compte depuis le bouton de connexion. Aucun outil publicitaire ou de mesure d’audience n’est intégré. Les polices et images sont chargées auprès de leurs fournisseurs.</p><h3>Avant l’ouverture publique</h3><p>L’exploitant doit renseigner son identité, son contact, la politique de confidentialité et organiser le traitement des signalements.</p>`);
$('#close-product').onclick=()=>$('#product-dialog').close();$('#close-info').onclick=()=>$('#info-dialog').close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}});
document.addEventListener('keydown',ev=>{if(!ev.target.matches('[role=tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;ev.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],index=tabs.indexOf(ev.target);let next=ev.key==='Home'?0:ev.key==='End'?tabs.length-1:(index+(ev.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;activeTab=tabs[next].dataset.tab;renderTab();tabs[next].focus();});
async function init(){
 try{const response=await fetch('./data/products.json');if(!response.ok)throw new Error();products=await response.json();$('#all-count').textContent=products.length;
 const hero=products.find(p=>p.id==='mc-big-mac')||products[0];$('#hero-image').src=hero.image;$('#hero-image').alt=hero.name;
 const news=[products.find(p=>p.id==='mc-beef-beaufort'),products.find(p=>p.brand==='burgerking'&&p.isNew),products.find(p=>p.brand==='kfc'&&p.name==='Tower® Raclette & Bacon')].filter(Boolean);
 $('#news-grid').innerHTML=news.filter(p=>!isArchived(p)).map(p=>`<button class="news-card" data-product="${e(p.id)}"><div><span class="tag">EN CE MOMENT</span><h3>${e(p.name)}</h3><small>${brands[p.brand]}</small><span class="news-link">Découvrir la recette ↗</span></div>${imageMarkup(p,'loading="lazy"')}</button>`).join('');renderCalendar();render();
 }catch{$('#product-grid').innerHTML='<div class="empty"><b>La carte se fait attendre.</b><p>Recharge la page pour réessayer.</p></div>';$('#product-grid').setAttribute('aria-busy','false');}
 if(api.configured){try{const c=await api.getClient();c.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>authChanged(session),0);});const {data}=await c.auth.getSession();await authChanged(data.session);ratings=await api.loadRatings();render();}catch{toast('La connexion aux avis est momentanément indisponible.');}}
}
init();
