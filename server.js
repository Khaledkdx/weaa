const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 3000);
const buildDir = path.join(__dirname, 'build', 'web');
const rootDir = fs.existsSync(path.join(buildDir, 'index.html'))
  ? buildDir
  : __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function safePath(urlPath) {
  const rawPath = urlPath.split('?')[0];
  const compatiblePath = rawPath.startsWith('/weaa/')
    ? rawPath.replace(/^\/weaa/, '')
    : rawPath;
  const decodedPath = decodeURIComponent(compatiblePath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  return path.join(rootDir, normalizedPath);
}

function serveFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control':
      extension === '.html'
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
  });
  if (extension === '.html') {
    const html = fs
      .readFileSync(filePath, 'utf8')
      .replace('<base href="/weaa/">', '<base href="/">')
      .replace('<base href="$FLUTTER_BASE_HREF">', '<base href="/">');
    response.end(html);
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const requestedPath = safePath(request.url || '/');
  const filePath = fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
    ? requestedPath
    : path.join(rootDir, 'index.html');

  if (!fs.existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('WEAA build files were not found.');
    return;
  }

  serveFile(response, filePath);
});

server.listen(port, () => {
  console.log(`WEAA static server running on port ${port}`);
  console.log(`Serving files from ${rootDir}`);
});
