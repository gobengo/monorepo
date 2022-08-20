import { fileURLToPath } from 'url';
import { menubar } from 'menubar';

if (process.argv[1] === fileURLToPath(import.meta.url)) { // (B)
  main()
}

async function main() {
  console.log('starting interoperating.app/desktop')
  const mb = menubar();

  mb.on('ready', () => {
    console.log('app is ready');
    // your app code here
  });

}
