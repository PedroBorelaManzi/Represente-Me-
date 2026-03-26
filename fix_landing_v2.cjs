const fs = require('fs');
let lines = fs.readFileSync('Landing_github.tsx', 'utf8').split('\n');

// Line numbers are 1-indexed in the view, so indices are line - 1
// But I need to be careful with \r\n vs \n
// I'll just use a more robust replacement

let content = fs.readFileSync('Landing_github.tsx', 'utf8');

// Fix the mistakes from the previous attempt
content = content.replace('</section>\n\n      {/* Hero Section */}', '</nav>\n\n      {/* Hero Section */}');
content = content.replace('      </nav>\n\n      {/* Footer */}', '      </section>\n\n      {/* Footer */}');

// Let's also handle \r\n just in case
content = content.replace('</section>\r\n\r\n      {/* Hero Section */}', '</nav>\r\n\r\n      {/* Hero Section */}');
content = content.replace('      </nav>\r\n\r\n      {/* Footer */}', '      </section>\r\n\r\n      {/* Footer */}');

// Fix the Logo import if it's causing issues
// Actually, let's see if tsc complains about it after this.

fs.writeFileSync('Landing_github.tsx', content);
console.log('Fixed Landing_github.tsx tags');
