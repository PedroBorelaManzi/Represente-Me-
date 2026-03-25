const fs = require('fs');

let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');
layout = layout.replace(
  '<img src={logo} alt="Represente-Me!" className="h-14 w-auto mx-auto" />',
  '<img src={logo} alt="Represente-Me!" className="h-24 w-auto mx-auto object-contain" />'
);
fs.writeFileSync('src/components/Layout.tsx', layout);

let login = fs.readFileSync('src/pages/Login.tsx', 'utf8');
login = login.replace(
  '<div className="p-8 text-center bg-slate-950 text-white">\r\n          <img src={logo} alt="Represente-Me!" className="h-20 w-auto mx-auto mb-4" />\r\n          <p className="text-indigo-100 text-sm mt-1">Gestão inteligente para representantes</p>\r\n        </div>',
  '<div className="p-8 text-center pt-8">\r\n          <img src={logo} alt="Represente-Me!" className="h-32 w-auto mx-auto mb-4 object-contain" />\r\n          <p className="text-slate-500 font-medium text-sm mt-1">Gestão inteligente para representantes</p>\r\n        </div>'
);
login = login.replace(
  '<div className="p-8 text-center bg-slate-950 text-white">\n          <img src={logo} alt="Represente-Me!" className="h-20 w-auto mx-auto mb-4" />\n          <p className="text-indigo-100 text-sm mt-1">Gestão inteligente para representantes</p>\n        </div>',
  '<div className="p-8 text-center pt-8">\n          <img src={logo} alt="Represente-Me!" className="h-32 w-auto mx-auto mb-4 object-contain" />\n          <p className="text-slate-500 font-medium text-sm mt-1">Gestão inteligente para representantes</p>\n        </div>'
);
fs.writeFileSync('src/pages/Login.tsx', login);

let landing = fs.readFileSync('src/pages/Landing.tsx', 'utf8');
landing = landing.replace(
  '<div className="flex justify-between h-16 items-center">\n            <img src={logo} alt="Represente-Me!" className="h-12 w-auto" />',
  '<div className="flex justify-between h-24 items-center">\n            <img src={logo} alt="Represente-Me!" className="h-20 w-auto object-contain" />'
);
landing = landing.replace(
  '<div className="flex justify-between h-16 items-center">\r\n            <img src={logo} alt="Represente-Me!" className="h-12 w-auto" />',
  '<div className="flex justify-between h-24 items-center">\r\n            <img src={logo} alt="Represente-Me!" className="h-20 w-auto object-contain" />'
);
landing = landing.replace(
  '<img src={logo} alt="Represente-Me!" className="h-20 w-auto mx-auto mb-6" />',
  '<img src={logo} alt="Represente-Me!" className="h-32 w-auto mx-auto mb-6 object-contain" />'
);
fs.writeFileSync('src/pages/Landing.tsx', landing);
console.log("Replaced successfully");
