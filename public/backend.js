const config=window.CROQ_CONFIG||{};
export const configured=Boolean(config.supabaseUrl&&config.supabaseAnonKey);
let client;
export async function getClient(){
  if(!configured) return null;
  if(!client){
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.49.8');
    client=createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  }
  return client;
}
export async function login(){
  const c=await getClient(); if(!c) throw new Error('La connexion Discord attend la configuration du site.');
  const {error}=await c.auth.signInWithOAuth({provider:'discord',options:{redirectTo:new URL('./',location.href).href}});if(error)throw error;
}
export async function loadRatings(){
  const c=await getClient();if(!c)return {};
  const {data,error}=await c.from('product_ratings').select('*');if(error)throw error;
  return Object.fromEntries(data.map(x=>[x.product_id,{average:Number(x.average),count:x.count}]));
}
export async function loadReviews(productId){
  const c=await getClient();if(!c)return [];
  const {data,error}=await c.from('public_reviews').select('*').eq('product_id',productId).order('updated_at',{ascending:false}).limit(100);if(error)throw error;return data;
}
export async function saveReview(productId,rating,body,restaurant){
  const c=await getClient();if(!c)throw new Error('La sauvegarde partagée attend la configuration du site.');
  const {data:{user}}=await c.auth.getUser();if(!user)throw new Error('Connecte-toi avec Discord pour publier.');
  const {error}=await c.from('reviews').upsert({user_id:user.id,product_id:productId,rating,body:body.trim(),restaurant:restaurant.trim()},{onConflict:'user_id,product_id'});if(error)throw error;
}
export async function deleteReview(id){const c=await getClient();const {error}=await c.from('reviews').delete().eq('id',id);if(error)throw error;}
export async function reportReview(id){const c=await getClient();const {data:{user}}=await c.auth.getUser();if(!user)throw new Error('Connecte-toi pour signaler cet avis.');const {error}=await c.from('reports').insert({review_id:id,user_id:user.id,reason:'À examiner par la modération'});if(error&&error.code!=='23505')throw error;}
