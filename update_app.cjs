const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

let oldProviders =       <SettingsProvider>
        <UploadProvider>
          <BrowserRouter>;

let newProviders =       <BrowserRouter>
        <SettingsProvider>
          <UploadProvider>;

let oldProvidersEnd =           </BrowserRouter>
        </UploadProvider>
      </SettingsProvider>;

let newProvidersEnd =           </UploadProvider>
        </SettingsProvider>
      </BrowserRouter>;

content = content.replace(oldProviders, newProviders);
content = content.replace(oldProvidersEnd, newProvidersEnd);

fs.writeFileSync(file, content);
console.log('App.tsx updated');
