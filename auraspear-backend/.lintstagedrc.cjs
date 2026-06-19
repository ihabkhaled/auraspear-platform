const path = require('path')

const buildEslintCommand = fileNames =>
  `eslint ${fileNames.map(f => path.relative(process.cwd(), f)).join(' ')} --fix`

const buildPrettierCommand = fileNames =>
  `prettier --write ${fileNames.map(f => path.relative(process.cwd(), f)).join(' ')}`

const buildAddToGitAfterPrettier = fileNames =>
  `git add ${fileNames.map(f => path.relative(process.cwd(), f)).join(' ')}`

module.exports = {
  '*.ts': files => {
    if (!files.length) return []

    return [buildEslintCommand(files)]
  },

  '*.{ts,json,md,yml,yaml}': files => {
    if (!files.length) return []

    return [buildPrettierCommand(files), buildAddToGitAfterPrettier(files)]
  },
}
