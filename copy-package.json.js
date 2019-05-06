const fs = require('fs');
const path = require('path');

const {
  version,
  description,
  repository,
  author,
  license,
  name
} = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), process.argv[2]), 'utf-8')
);

const shortenedJson = { name, version, description, repository, author, license };

fs.writeFileSync(path.join(process.cwd(), process.argv[3]), JSON.stringify(shortenedJson, null, 4));
