const fs = require('fs');
const yaml = require('js-yaml');

const jsonData = JSON.parse(process.argv[2]);
const yamlData = yaml.dump(jsonData);
console.log(yamlData);

// fs.writeFile('./setters.yaml', yamlData.replace("metadata:", "metadata: # kpt-merge: /setters"), 'utf8', (err) => {
//     if (err) {
//       console.error(err.message);
//       process.exit(1);
//     }
// });