const fs = require('fs');
const file = 'src/components/Layout.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure that clicking a navigation link forces a navigation to the base href
// even if we are on a sub-route. Link should do this, but we'll make it explicit.
// Also ensures the sidebar closes on mobile.

content = content.replace(
  /to=\{item\.href\}/g,
  'to={item.href} onClick={() => { if (location.pathname !== item.href) { setSidebarOpen(false); } }}'
);

fs.writeFileSync(file, content);
console.log('Improved Sidebar navigation in Layout.tsx');