import { fileURLToPath } from 'url';
import { dirname } from "path";
import { Menubar, menubar } from 'menubar';

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
    setAsDefaultProtocolClient(mb.app)
    handleOpenUrl(mb)
  });
}

function setAsDefaultProtocolClient(app: Menubar['app'], protocol='openid') {
  console.log('pre app.setAsDefaultProtocolClient')
  const didSet = app.setAsDefaultProtocolClient(protocol)
  console.log('post app.setAsDefaultProtocolClient', didSet)
}

function handleOpenUrl(mb: Menubar) {
  mb.app.on('open-url', function (event, data) {
    event.preventDefault();
    console.log('open-url ', data)
    const url = new URL(data);
    switch (url.protocol) {
      case 'openid:':
        console.log('handling openid SIOP URL')
        // mb.showWindow()
        break;
    }
  });
}
