const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '../src/modules/admin/admin.routes.ts');
let adminContent = fs.readFileSync(adminPath, 'utf8');

// remove router.get('/dashboard/stats' ... ) 
const regexAdmin = /\/\/ GET \/dashboard\/stats[\s\S]*?res\.status\(500\)\.json\({ error: 'Ocorreu um erro no servidor\.' }\);\n  }\n}\);\n/g;
if (regexAdmin.test(adminContent)) {
    adminContent = adminContent.replace(regexAdmin, '');
    fs.writeFileSync(adminPath, adminContent, 'utf8');
} else {
    console.log("Failed to match dashboard in admin.routes.ts");
}

const recompensasPath = path.join(__dirname, '../src/modules/recompensas/recompensas.routes.ts');
let recContent = fs.readFileSync(recompensasPath, 'utf8');

// remove router.post('/resgates' ... )
const regexRec = /\/\/ POST \/resgates[\s\S]*?if \(client\) client\.release\(\);\n  }\n}\);\n/g;
if (regexRec.test(recContent)) {
    recContent = recContent.replace(regexRec, '');
    fs.writeFileSync(recompensasPath, recContent, 'utf8');
} else {
    console.log("Failed to match resgates in recompensas.routes.ts");
}
