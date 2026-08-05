const fs = require('fs')
const path = require('path')

const root = path.join('D:/师生网站/src')
const replacements = [
  [/#667eea/g, '$primary'],
  [/#764ba2/g, '$primary-dark'],
  [/#1f2937/g, '$text-primary'],
  [/#1a1a2e/g, '$text-primary'],
  [/#374151/g, '$text-secondary'],
  [/#4b5563/g, '$text-secondary'],
  [/#6b7280/g, '$text-secondary'],
  [/#4a4a6a/g, '$text-secondary'],
  [/#9ca3af/g, '$text-muted'],
  [/#8a8aaa/g, '$text-muted'],
  [/#cbd5e1/g, '$text-muted'],
  [/#e5e7eb/g, '$border-color'],
  [/#e8ecf4/g, '$border-color'],
  [/#f5f7fa/g, '$bg-body'],
  [/#f5f7fc/g, '$bg-body'],
  [/#f8fafc/g, '$bg-body'],
  [/#f1f5f9/g, '$bg-body'],
]

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, files)
    else if (name.endsWith('.vue')) files.push(p)
  }
  return files
}

const files = walk(path.join(root, 'views')).concat(walk(path.join(root, 'components')))
let changed = 0

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const re = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi
  let fileChanged = false
  const next = src.replace(re, (full, open, content, close) => {
    let updated = content
    for (const [regex, to] of replacements) updated = updated.replace(regex, to)
    if (updated === content) return full
    fileChanged = true
    let openTag = open
    if (updated.includes('$') && !/lang\s*=\s*["']scss["']/i.test(openTag)) {
      openTag = openTag.replace(/<style/i, '<style lang="scss"')
    }
    return openTag + updated + close
  })
  if (fileChanged) {
    fs.writeFileSync(file, next, 'utf8')
    changed += 1
    console.log('updated', path.relative(root, file))
  }
}

console.log('files changed:', changed)
