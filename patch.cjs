
const fs = require("fs");
const path = require("path");

function patch(file, search, replace) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes(search)) {
        const newContent = content.replace(search, replace);
        fs.writeFileSync(file, newContent);
        console.log(`Patched ${file}`);
    } else {
        console.error(`Could not find target in ${file}`);
        process.exit(1);
    }
}

// App.tsx
patch("src/App.tsx", 
    "import AgendaPage from \"./pages/Agenda\";", 
    "import AgendaPage from \"./pages/Agenda\";\nimport PedidosPage from \"./pages/Pedidos\";"
);
patch("src/App.tsx", 
    "<Route path=\"agenda\" element={<AgendaPage />} />", 
    "<Route path=\"agenda\" element={<AgendaPage />} />\n              <Route path=\"pedidos\" element={<PedidosPage />} />"
);

// Layout.tsx
patch("src/components/Layout.tsx",
    "Calendar } from \"lucide-react\";",
    "Calendar, ShoppingCart } from \"lucide-react\";"
);
patch("src/components/Layout.tsx",
    "{ name: \"Agenda\", href: \"/dashboard/agenda\", icon: Calendar },",
    "{ name: \"Agenda\", href: \"/dashboard/agenda\", icon: Calendar },\n    { name: \"Pedidos\", href: \"/dashboard/pedidos\", icon: ShoppingCart },"
);
