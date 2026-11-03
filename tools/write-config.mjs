import {readFile,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
// Les variables GitHub sont facultatives si la configuration publique est fournie.
const current={window:{}};
runInNewContext(await readFile(new URL('../public/config.js',import.meta.url),'utf8'),current,{timeout:100});
const saved=current.window.CROQ_CONFIG||{};
const config={supabaseUrl:process.env.SUPABASE_URL||saved.supabaseUrl||'',supabaseAnonKey:process.env.SUPABASE_ANON_KEY||saved.supabaseAnonKey||''};
if(!config.supabaseUrl||!config.supabaseAnonKey)throw new Error('Renseigne les variables GitHub SUPABASE_URL et SUPABASE_ANON_KEY avant le déploiement.');
const url=new URL(config.supabaseUrl);if(url.protocol!=='https:')throw new Error('Supabase doit utiliser HTTPS.');
if(config.supabaseAnonKey.startsWith('sb_secret_'))throw new Error('Une clé secrète ne doit jamais être publiée.');
if(config.supabaseAnonKey.split('.').length===3){try{const payload=JSON.parse(Buffer.from(config.supabaseAnonKey.split('.')[1],'base64url'));if(payload.role!=='anon')throw new Error('Clé Supabase non publique.');}catch{throw new Error('Utilise uniquement une clé publishable ou anon.');}}
await writeFile(new URL('../public/config.js',import.meta.url),'window.CROQ_CONFIG = '+JSON.stringify(config)+';\n');
