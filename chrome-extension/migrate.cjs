const fs = require('fs');
const path = require('path');

const srcDir = 'D:/Social-Intelligence-Standalone-Douyin-v1.1.0-20260804/Social-Intelligence-Standalone-Douyin-v1.1.0-20260804/extension';
const destDir = 'D:/social-intelligence-src/entrypoints';

// 1. Migrate Background
let bgContent = fs.readFileSync(path.join(srcDir, 'background.js'), 'utf-8');
bgContent = `// @ts-nocheck\nexport default defineBackground(() => {\n${bgContent}\n});`;
fs.writeFileSync(path.join(destDir, 'background.ts'), bgContent);

// 2. Migrate douyin-main
let mainContent = fs.readFileSync(path.join(srcDir, 'content-scripts/douyin-main.js'), 'utf-8');
mainContent = `// @ts-nocheck\nexport default defineContentScript({\n  matches: ['*://*.douyin.com/*'],\n  world: 'MAIN',\n  main() {\n    ${mainContent}\n  }\n});`;
fs.writeFileSync(path.join(destDir, 'douyin-main.content.ts'), mainContent);

// 3. Migrate douyin-tools
let toolsContent = fs.readFileSync(path.join(srcDir, 'content-scripts/douyin-tools.js'), 'utf-8');
toolsContent = `// @ts-nocheck\nexport default defineContentScript({\n  matches: ['*://*.douyin.com/*'],\n  main() {\n    ${toolsContent}\n  }\n});`;
fs.writeFileSync(path.join(destDir, 'douyin-tools.content.ts'), toolsContent);

// Remove default content.ts
if (fs.existsSync(path.join(destDir, 'content.ts'))) {
  fs.unlinkSync(path.join(destDir, 'content.ts'));
}

console.log('Migration completed successfully.');
