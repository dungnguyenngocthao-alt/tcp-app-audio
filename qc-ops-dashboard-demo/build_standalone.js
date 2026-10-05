const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/styles.css', 'utf8');
const data = fs.readFileSync('js/data.js', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');
// Use function replacements so "$$" / "$&" in source are NOT treated as special.
html = html.replace(/<link rel="stylesheet" href="css\/styles\.css"\s*\/>/, () => '<style>\n' + css + '\n</style>');
html = html.replace(/<script src="js\/data\.js"><\/script>\s*<script src="js\/app\.js"><\/script>/,
  () => '<script>\n' + data + '\n</script>\n<script>\n' + app + '\n</script>');
html = html.replace('<head>', () => '<head>\n  <!-- Standalone single-file build — CSS & JS inlined. Open directly in any browser. -->');
fs.writeFileSync('standalone.html', html);
console.log('standalone.html bytes', fs.statSync('standalone.html').size);
