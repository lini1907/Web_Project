import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/public/fonts');
await fs.mkdir(output,{recursive:true});
const response=await fetch('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400..800&display=swap',{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'}});
if(!response.ok)throw Error(`Font CSS ${response.status}`);
const css=await response.text();
let local='/* Nunito Sans, SIL Open Font License. See OFL.txt. */\n';
for(const name of ['vietnamese','latin-ext','latin']){
  const block=css.match(new RegExp(`/\\* ${name} \\*/\\s*(@font-face \\{[^}]+\\})`))?.[1];
  if(!block)throw Error(`Missing font subset ${name}`);
  const url=block.match(/url\(([^)]+)\)/)?.[1];
  const font=await fetch(url);if(!font.ok)throw Error(`Font ${font.status}`);
  await fs.writeFile(path.join(output,`nunito-sans-${name}.woff2`),Buffer.from(await font.arrayBuffer()));
  local+=block.replace(url,`nunito-sans-${name}.woff2`)+'\n';
}
await fs.writeFile(path.join(output,'nunito-sans.css'),local);
const license=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/OFL.txt');
if(!license.ok)throw Error(`Font license ${license.status}`);
await fs.writeFile(path.join(output,'OFL.txt'),await license.text());
console.log('Saved Nunito Sans Latin, Latin Extended and Vietnamese variable WOFF2 fonts.');
