import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { join } from 'node:path'

export function compile(source) {
  return stripTypeScriptTypes(source).replace(/(from\s+['"][^'"]+)\.ts(['"])/g, '$1.js$2')
}

async function buildDirectory(source, destination) {
  await mkdir(destination, { recursive: true })
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const input = join(source, entry.name)
    if (entry.isDirectory()) {
      await buildDirectory(input, join(destination, entry.name))
    } else if (entry.name.endsWith('.ts')) {
      const output = join(destination, entry.name.replace(/\.ts$/, '.js'))
      await writeFile(output, compile(await readFile(input, 'utf8')))
    } else {
      await copyFile(input, join(destination, entry.name))
    }
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  await buildDirectory('src', 'dist/src')
  await copyFile('index.html', 'dist/index.html')
  console.log('Сборка готова в dist/')
}
