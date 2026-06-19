const path = require('path')

const toForwardSlash = p => p.split(path.sep).join('/')

const buildEslintCommand = fileNames =>
  `eslint ${fileNames.map(f => `"${toForwardSlash(path.relative(process.cwd(), f))}"`).join(' ')} --fix`

const buildPrettierCommand = fileNames =>
  `prettier --write ${fileNames.map(f => toForwardSlash(path.relative(process.cwd(), f))).join(' ')}`

const buildAddToGitAfterPrettier = fileNames =>
  `git add ${fileNames.map(f => toForwardSlash(path.relative(process.cwd(), f))).join(' ')}`

module.exports = {
  '*.{ts,tsx,js,jsx}': files => {
    if (!files.length) return []

    return [buildEslintCommand(files)]
  },

  '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}': files => {
    if (!files.length) return []

    return [buildPrettierCommand(files), buildAddToGitAfterPrettier(files)]
  },
}
