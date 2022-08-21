const path = require('path');
const fs = require('fs/promises')
const fs1 = require('fs')

module.exports = {
  async postMake() {
    console.log('postMake', arguments)
    await copyMenubarToWebpack();
  },
};

const packageRoot = path.resolve(__dirname, '../')
const webpackRoot = path.resolve(packageRoot, '.webpack')

async function copyMenubarToWebpack() {
  console.log(arguments.callee.name, {
    repoRoot: packageRoot,
  })
  const webpackAssetsDir = path.join(webpackRoot, 'assets')
  await fs.mkdir(webpackAssetsDir, { recursive: true })
  const iconTemplateFinalPath = path.join(webpackAssetsDir, '/IconTemplate.png')
  await fs.copyFile(
    path.join(packageRoot, './src/assets/IconTemplate.png'),
    iconTemplateFinalPath,
  )
  if ( ! fs1.existsSync(iconTemplateFinalPath)) {
    throw new Error(`nope ${iconTemplateFinalPath} dont exist`)
  }
  console.log('copied to', { iconTemplateFinalPath })
  // await fs.cp(`${packageRoot}/assets/`, path.join(webpackRoot, './assets/'))
}
