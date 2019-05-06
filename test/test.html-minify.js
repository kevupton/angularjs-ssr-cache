const fs = require('fs');
const path = require('path');

const json = JSON.parse(fs.readFileSync(path.join(__dirname, './.cache/_'), 'utf-8'));
fs.writeFileSync('./test.html', json.content);
