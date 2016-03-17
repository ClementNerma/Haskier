'use strict';

// A generic object to store any data
var globalData = {};

/**
  * Transform a value to plain text (excepted buffers)
  * @param {string} value
  */
function asPlain(value) {
  if(typeof value === 'string' || value instanceof Buffer)
    return value;
  else if(typeof value === 'number')
    return value.toString();
  else if(typeof value === 'object' && value)
    return JSON.stringify(value);
  else if(value === null)
    return 'null';
  else if(value === false)
    return 'false';
  else if(value === true)
    return 'true';
  else if(typeof value.toString === 'function')
    return value.toString();
  else
    return '';
}

/**
  * Normalize a path
  * @param {string} input
  * @return {string}
  */
function normalize(input) {
  var parts = input.split(/\\|\//), out = [];

  for(var i = 0; i < parts.length; i++) {
    if(parts[i] !== '.' && parts[i].length) {
      if(parts[i] === '..' && out.length)
        out.pop();
      else if(parts[i] !== '..')
        out.push(parts[i]);
    }
  }

  return out.join(path.sep)
}

var http   = require('http'),
    fs     = require('fs'),
    cson   = require('cson'),
    path   = require('path'),
    isbin  = require('isbinaryfile'),
    _url   = require('url'),
    serverCallback, verbose = process.argv.indexOf('--verbose') !== -1, base = __dirname.replace(/^(.*)\/|\\([^\/\\]+)$/, '$2');

process.chdir(__dirname);

try { var config = cson.parseString(fs.readFileSync('config.cson', 'utf-8')); }
catch(e) { throw new Error('Failed to parse `config.cson`\n' + e.message); }

try { var serve = cson.parseString(fs.readFileSync('serve.cson', 'utf-8')); }
catch(e) { throw new Error('Failed to parse `serve.cson`\n' + e.message); }

if(config.directory) {
  try { process.chdir(config.directory); }
  catch(e) { throw new Error('Failed to go to serve directory : ' + directory + '\n' + e.message); }
}

if(verbose)
  console.log('In directory ' + process.cwd());

var server = http.createServer(serverCallback = function(req, res) {
  var ip = req.socket.remoteAddress.substr(7);

  var parsed = _url.parse(req.url, true), url = normalize(parsed.pathname.substr(1)) || 'index.html';
  var file = path.join(url), found = false, stat, content, stat, ext, mime, msg;

  try { stat = fs.lstatSync(file); found = stat.isFile(); /*config.allowShowDirs ? (stat.isFile() || stat.isDir()) : stat.isFile();*/ }
  catch(e) {}

  if(!found) {
    console.error('404 ' + req.url);

    res.writeHead(404, {
      'Content-Type': serve['mime-types'].html || 'text/html',
      'Content-Length': (msg = '<h1>404 Not Found</h1>').length
    });
    res.end(msg);
  } else if((config.forbid && config.forbid.indexOf(file)) || (!config.allowServerAccess && file.substr(0, base.length + 1) === base + path.sep)) {
    console.error('403 ' + req.url);

    res.writeHead(403, {
      'Content-Type': serve['mime-types'].html || 'text/html',
      'Content-Length': (msg = '<h1>403 Forbidden</h1>').length
    });
    res.end(msg);
  } else { // Requested file found
    try {
      ext     = path.extname(file).substr(1);
      content = fs.readFileSync(file);

      if(isbin.sync(content, stat.size)) {
        res.writeHead(200, {
          'Content-Type': serve['mime-types'][ext] || serve['mime-types']['.binary'] || 'application/octet-stream',
          'Content-Length': stat.size
        });
        res.end(content);

        if(verbose)
          console.log(200 + ' --- BIN ' + req.url);
      } else {
        if(ext === 'run' && config.allowRunFiles) {
          new Function(['gdata', 'req', 'IP', 'res', 'preq', 'GET', 'url', 'file', 'normalize', 'require', 'fs', 'path', 'resolve'], content.toString(config.runEncoding || 'utf-8'))(
            globalData,
            req,
            ip,
            res,
            parsed,
            parsed.query,
            url,
            file,
            normalize,
            require,
            fs,
            path,
            function(content, options) {
              var bin; options = options || {};

              if(options.autoServe !== false) {
                if(content instanceof Buffer && (bin = isbin.sync(content, content.length)))
                  res.writeHead(options.code || 200, {
                    'Content-Type': mime || serve['mime-types']['.binary'] || 'application/octet-stream',
                    'Content-Length': stat.size
                  });
                else {
                  content = asPlain(content);

                  res.writeHead(options.code || 200, {
                    'Content-Type'  : mime || config.runMimeType || serve['mime-types']['.default'] || 'text/plain'
                  });
                }
              }

              res.end(content);

              if(verbose)
                console.log((options.code || 200) + ' RUN ' + (bin ? 'BIN' : 'PLN') + ' ' + req.url);
            }
          );
        } else {
          res.writeHead(200, {
            'Content-Type': serve['mime-types'][ext] || serve['mime-types']['.default'] || 'text/plain'
          });
          res.end(content);

          if(verbose)
            console.log(200 + ' --- PLN ' + req.url);
        }
      }
    }

    catch(e) { var err;
      content = '<h1>500 Internal Server Error</h1>';
      console.error(url + '\n' + file + '\n' + '500 Internal Server Error\n' + e.stack + '\n');
      try { fs.appendFileSync('.logs' + path.sep + '500.log', Date.now() + ': ' + url + ' | ' + file + ' | 500 | ' + e.stack.split('\n').join('|'), 'utf-8'); }
      catch(e) { console.log('NOTE: Failed to log\n'); }

      res.writeHead(500, {
        'Content-Type': serve['mime-types'].html || 'text/html',
        'Content-Length': (msg = '<h1>500 Internal Server Error</h1>').length
      });
      res.end(msg);
    }
  }
}).listen(config.port);

console.log('Server is running on port ' + config.port);
