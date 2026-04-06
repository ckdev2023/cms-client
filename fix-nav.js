const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('/Users/ck/workplace/cms-client/packages/prototype/admin/*.html');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Regex to match the nav section wrapper
  const navRegex = /<div class="flex items-center space-x-8">\s*<!-- Logo -->\s*<a\s*href="admin-prototype\.html"\s*class="text-white display-font font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity"\s*>\s*Gyosei OS\s*<\/a>\s*<!-- Links -->\s*<div class="hidden md:flex space-x-6 overflow-x-auto">/g;

  const replacement = `<div class="flex items-center space-x-8 flex-1 min-w-0">
          <!-- Logo -->
          <a
            href="admin-prototype.html"
            class="text-white display-font font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity flex-shrink-0 whitespace-nowrap"
          >
            Gyosei OS
          </a>
          <!-- Links -->
          <div class="hidden md:flex items-center space-x-6 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">`;

  content = content.replace(navRegex, replacement);

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${path.basename(file)}`);
}
