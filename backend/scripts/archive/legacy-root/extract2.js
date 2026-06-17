const fs = require('fs');
const content = fs.readFileSync('c:/Users/Gui/AppData/Roaming/Code/User/workspaceStorage/c08041cc27ecfa2c58f3f682ec946719/GitHub.copilot-chat/chat-session-resources/1ca7d006-5fd1-4290-9447-150d9ed066bc/call_MHxEMFc4YUtPdUM4TmJUd0phMDk__vscode-1774296882263/content.txt', 'utf8');

const blocks = content.split('## **');
blocks.forEach(block => {
  if (block.includes('src/modules/')) {
    const filenameMatch = block.match(/`(src\/modules\/[^`]+)`/);
    if (!filenameMatch) return;
    const filename = filenameMatch[1];
    
    const codeStart = block.indexOf('```typescript');
    if (codeStart === -1) return;
    
    const codeEnd = block.indexOf('```', codeStart + 13);
    if (codeEnd === -1) return;
    
    const code = block.substring(codeStart + 13, codeEnd).trim();
    console.log('Writing', filename, code.length, 'bytes');
    
    fs.mkdirSync(require('path').dirname(filename), { recursive: true });
    fs.writeFileSync(filename, code + '\n');
  }
});
