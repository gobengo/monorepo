import { fileURLToPath } from 'url';
import { dirname } from "path";
import { menubar } from 'menubar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)
const isImportMetaUrl = Boolean(process.argv[1] === fileURLToPath(import.meta.url))
const isNpmStart = Boolean(process.argv[1] === ".")

if (isImportMetaUrl || isNpmStart) {
  main()
}

async function main() {
  console.log('starting interoperating.app/desktop/src/main')
  const mb = menubar({
    dir: __dirname,
  });
  mb.on('ready', () => {
    console.log('menubar is ready');
    // your app code here
  });
}
