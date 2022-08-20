import {fileURLToPath} from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) { // (B)
  main()
}

async function main() {
  console.log('starting interoperating.app/desktop')
}
