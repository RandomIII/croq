const fs = require('node:fs');
const h = fs.readFileSync('croq/research/burgerking.html', 'utf8');
const chunks = [...h.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)].map(m => {try{return JSON.parse(m[1])[1] || ''}catch{return ''}}).join('');
fs.writeFileSync('croq/research/bk-flight.txt', chunks);
for (const line of chunks.split('\n')) {
  const i = line.indexOf(':');
  try {
    const data = JSON.parse(line.slice(i + 1));
    function walk(v) {
      if (!v || typeof v !== 'object') return;
      if(v.products && v.allergens) { fs.writeFileSync('croq/research/bk-catalog.json', JSON.stringify(v,null,2)); console.log('Catalogue trouvé',Object.keys(v)); }
      Object.values(v).forEach(walk);
    }
    walk(data);
  } catch {}
}
