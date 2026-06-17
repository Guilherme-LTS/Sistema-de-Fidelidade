const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('c:/Users/Gui/AppData/Roaming/Code/User/workspaceStorage/c08041cc27ecfa2c58f3f682ec946719/GitHub.copilot-chat/chat-session-resources/1ca7d006-5fd1-4290-9447-150d9ed066bc/call_MHxEMFc4YUtPdUM4TmJUd0phMDk__vscode-1774296882263/content.txt', 'utf8');

// Find all occurrences of markdown typed code blocks that follow a file path heading
const regex = /##\s+\*\*.*?(src\/modules\/[^\*]+\.ts)\*\*[\s\S]*?```(?:typescript|ts)?\n([\s\S]*?)```/g;
let match;
let matchCount = 0;

while ((match = regex.exec(content)) !== null) {
  matchCount++;
  const filePath = match[1];
  const code = match[2];
  console.log(`Extracting: ${filePath} (${code.length} bytes)`);
  
  const fullPath = path.join(process.cwd(), filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, code.trim() + '\n', 'utf8');
}

console.log(`Extracted ${matchCount} files.`);
