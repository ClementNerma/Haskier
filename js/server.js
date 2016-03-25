'use strict';

const packetSize = 64;
var   servers    = {};

Object.defineProperty(window, 'Server', {
  enumerable: true,
  configurable: false,
  writable: false,
  value: function(_ip) {

  var _chdir  = '/',
        sep   = '/',
      _table  = {},
      _files  = {},
      _states = {},
      _netwk  = {},
      _events = {incoming: {}},

      _ports    = [],
      _requests = {};

  if(!_ip)
    throw new Error('When instanciating server : Missing IP adress');

  if(servers.hasOwnProperty(_ip))
    throw new Error('When instanciating server : This IP "' + _ip + '" is already taken');

  servers[_ip] = this;

  /**
    * Generate a random ID
    * @return {string}
    */
  function generateId() {
    function g() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
    return g() + '-' + g() + '-' + g() + '-' + g();
  }

  /**
    * Clone any value
    * @param {*} oReferance Value to clone
    * @return {*} Cloned value
    */
  var clone = function(oReferance) {
    var aReferances = new Array();
    var getPrototypeOf = function(oObject) {
      if(typeof(Object.getPrototypeOf)!=="undefined")
        return Object.getPrototypeOf(oObject);

      var oTest = new Object();

      if(typeof(oObject.__proto__)!=="undefined" && typeof(oTest.__proto__)!=="undefined" && oTest.__proto__===Object.prototype)
        return oObject.__proto__;

      if(typeof(oObject.constructor)!=="undefined" && typeof(oTest.constructor)!=="undefined" && oTest.constructor===Object && typeof(oObject.constructor.prototype)!=="undefined")
        return oObject.constructor.prototype;

      return Object.prototype;
    };

    var recursiveCopy = function(oSource) {
      if(typeof(oSource)!=="object")
        return oSource;

      if(oSource===null)
        return null;

      for(var i = 0; i < aReferances.length; i++)
        if(aReferances[i][0]===oSource)
          return aReferances[i][1];

      if(Array.isArray(oSource)) {
        var oCopy = [];
        oCopy.prototype = getPrototypeOf(oSource);
        aReferances.push([oSource, oCopy]);

        for(var k in oSource)
          oCopy[k] = recursiveCopy(oSource[k]);
      } else {
        var Copy = new Function();
        Copy.prototype = getPrototypeOf(oSource);
        var oCopy = new Copy();
        aReferances.push([oSource,oCopy]);

        for(var sPropertyName in oSource) {
          if(oSource.hasOwnProperty(sPropertyName))
            oCopy[sPropertyName] = recursiveCopy(oSource[sPropertyName]);
        }
      }

      return oCopy;
    };

    return recursiveCopy(oReferance);
  };

  /**
    * Transform a value to plain text (excepted buffers)
    * @param {string} value
    */
  function asPlain(value) {
    if(typeof value === 'string')
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
    else if(value && typeof value.toString === 'function')
    return value.toString();
    else
    return '';
  }

  /**
    * Normalize a path
    * @param {string} input
    * @param {boolean} [allowChdir]
    * @return {string}
    */
  function normalize(input, allowChdir) {
    if(!input)
      return (allowChdir ? _chdir : '');

    var parts = input.split(/\\|\//), out = [];

    if(input.substr(0, 1) !== '/' && _chdir !== '/' && allowChdir)
      parts.splice.apply(parts, [0, 0].concat(_chdir.split('/')));

    for(var i = 0; i < parts.length; i++) {
      if(parts[i] !== '.' && parts[i].length) {
        if(parts[i] === '..' && out.length)
          out.pop();
        else if(parts[i] !== '..')
          out.push(parts[i]);
      }
    }

    return (allowChdir ? '/' : '') + out.join(sep);
  }

  this.fs = function(path, type, write) { return _fs(path, type, write); };

  /**
    * Perform an action on the filesystem
    * @param {string} _path
    * @param {string} type
    * @param {string} [write]
    * @return {boolean|object}
    */
  function _fs(_path, type, write) {
    var path = normalize(_path, true).substr(1);

    if(!path) {
      if(typeof _files !== type)
        return false;

      if(write)
        _files = write;

      return _files;
    }

    var d = _files, p = '', err = false;

    path = path.split(sep);

    for(var i = 0; i < path.length - 1; i += 1) {
      if(typeof ({})[path[i]] !== 'undefined')
        path[i] = '___' + path[i];

      p += sep + path[i];
      d = d[path[i]];

      if(typeof d !== 'object') {
        err = true;
        break;
      }
    }

    i = path.length - 1;

    if(typeof ({})[path[i]] !== 'undefined') {
      path[i] = '___' + path[i];

      if(write)
        console.warn('Using a reserved JavaScript-name will make file or folder unable to use files table');
    }

    if(err)
      return false;

    var r = typeof write !== 'undefined' || (typeof d[path[i]] === type ? d[path[i]] : false);

    if(typeof write === 'undefined' || !r)
      return r;

    if(write !== false) {
      if(!d.hasOwnProperty(path[i]))
      _table[path.join(sep)] = {created: (new Date()).getTime()};

      d[path[i]] = write;
    } else {
      delete d[path[i]];
      delete _table[path.join(sep)];
    }

    return true;
  };

  /**
    * Check if a file/dir exists
    * @param {string} file
    * @return {boolean}
    */
  this.exists = function(file) {
    return this.fileExists(file) || this.dirExists(file);
  };

  /**
    * Check if a file exists
    * @param {string} file
    * @return {boolean}
    */
  this.fileExists = function(file) {
    var ret = _fs(file, 'string');
    return ret === '' ? true : ret;
  };

  /**
    * Check if a directory exists
    * @param {string} dir
    * @return {boolean}
    */
  this.dirExists = function(dir) {
    return !!_fs(dir, 'object');
  };

  /**
    * Create an empty file
    * @param {string} file
    * @return {boolean}
    */
  this.touchFile = function(file) {
    if(this.fileExists(file))
      return false;

    return this.writeFile(file, '');
  };

  /**
    * Write a file
    * @param {string} file
    * @param {*} content
    * @return {boolean}
    */
  this.writeFile = function(file, content) {
    if(this.dirExists(file))
      return false;

    var ret = _fs(file, 'string', asPlain(content));
    if(ret && _table[file = normalize(file)])
      _table[file].edited = (new Date()).getTime();

    return ret;
  };

  /**
    * Append to a file
    * @param {string} file
    * @param {*} content
    * @param {boolean} [noNewLine]
    * @return {boolean}
    */
  this.appendFile = function(file, content, noNewLine) {
    if(!this.fileExists(file))
      return false;

    return this.writeFile(file, this.readFile(file) + (nowNewLine ? '' : '\n') + asPlain(content));
  };

  /**
    * Read a file
    * @param {string} file
    * @param {boolean} [RLEL] Remove Last Empty Line
    * @return {boolean|string}
    */
  this.readFile = function(file, RLEL) {
    var c = _fs(file, 'string');

    if(typeof c !== 'string' || !RLEL)
      return c;

    return c.substr(c.length - 1, 1) === '\n' ? c.substr(0, c.length - 1) : c;
  };

  /**
    * Read a file as JSON
    * @param {string} file
    * @return {boolean|object}
    */
  this.readJSON = function(file) {
    var c = _fs(file, 'string');
    if(typeof c !== 'string') return c;
    try { return JSON.parse(c); }
    catch(e) { return false; }
  };

  /**
    * Remove a file
    * @param {string} file
    * @return {boolean}
    */
  this.removeFile = function(file) {
    if(!this.fileExists(file)) return false;
    return _fs(file, 'string', false);
  };

  /**
    * Make a directory
    * @param {string} dir
    * @return {boolean}
    */
  this.makeDir = function(dir) {
    if(this.exists(dir))
      return false;

    var ret = _fs(dir, 'object', {});
    return ret;
  };

  /**
    * Read a directory
    * @param {string} dir
    * @param {boolean} [showHidden]
    * @return {boolean|array}
    */
  this.readDir = function(dir, showHidden) {
    var d = _fs(dir, 'object'), out = [];
    if(!d) return false;
    dir = normalize(dir, true).substr(1);

    d = Object.keys(d);

    for(var i = 0; i < d.length; i++) {
      if(!_table[(dir ? dir + '/' : '') + d[i]] || !_table[(dir ? dir + '/' : '') + d[i]].hidden || (_table[(dir ? dir + '/' : '') + d[i]].hidden && showHidden)) {
        if(d[i].substr(0, 3) === '___' && typeof ({})[d[i].substr(3)] !== 'undefined')
          d[i] = d[i].substr(3);

        out.push(d[i]);
      }
    }

    return out;
  };

  /**
    * Check if a directory has subfolders
    * @param {string} dir
    * @return {boolean}
    */
  this.hasSubFolders = function(dir) {
    var ls = this.readDir(dir = normalize(dir));

    if(!ls)
      return ls;

    for(var i = 0; i < ls.length; i++)
      if(this.dirExists(dir + '/' + ls[i]))
        return true;

    return false;
  };

  /**
    * Remove an empty directory
    * @param {string} dir
    * @return {boolean|string}
    */
  this.removeDir = function(dir) {
    if(!this.dirExists(dir))
      return "Directory not found";

    if(this.ls(dir).length)
      return "Directory is not empty";

    return _fs(dir, 'object', false) ? false : "Failed to remove directory";
  };

  /**
    * Remove an entire directory and its content
    * @param {string} dir
    * @return {boolean|string}
    */
  this.removeTree = function(dir) {
    if(!this.dirExists(dir = normalize(dir)))
      return "Directory not found";

    var ret = _fs(dir, 'object', false);

    if(!ret)
      return "Failed to remove directory";

    var keys = Object.keys(_table);

    // Remove entries from the files table
    for(var i = 0; i < keys.length; i++)
      if(keys[i].substr(0, dir.length + 1) === dir + '/')
        delete _table[keys[i]];
  };

  /**
    * Make a file tree from directory
    * @param {string} dir
    * @param {boolean} [textual] Textual representation
    * @return {boolean|object}
    */
  this.tree = function(dir, textual) {
    if(!this.dirExists(dir))
      return false;

    var items = this.ls(dir = dir || ''), r = {};

    for(var i = 0; i < items.length; i++) {
      if(this.dirExists(dir + '/' + items[i]))
        r[items[i]] = this.tree(dir + '/' + items[i]);
      else
        r[items[i]] = 1;
    }

    if(!textual)
      return r;

    function recurse(tree) {
      level += '  ';

      if(level.length === 2)
        level = level.substr(0, level.length - 1);

      var keys = Object.keys(tree);

      if(keys.length) {
        for(var i = 0; i < keys.length; i++) {
          if(typeof tree[keys[i]] === 'object') {
            // Folder !!
            str += '\n' + level + '└─┬ ' + keys[i];
            recurse(tree[keys[i]]);
          } else
            str += '\n' + level + '├── ' + fescape(keys[i]);
        }
      } else
        // empty folder
        str += '\n' + level + '├── ${f_grey,italic:Empty}';

      level = level.substr(0, level.length - 2);
    }

    var level = '', str = normalize(dir) || '/';
    recurse(r);
    return str;
  };

  /**
    * Hide a file or a directory
    * @param {string} file
    * @return {boolean}
    */
  this.hide = function(dir) {
    if(!this.exists(dir = normalize(dir)))
    return false;

    _table[dir] = _table[dir] || {};
    _table[dir].hidden = true;
    return true;
  };

  /**
    * Unhide a file or a directory
    * @param {string} file
    * @return {boolean}
    */
  this.unhide = function(dir) {
    if(!this.exists(dir  = normalize(dir)))
    return false;

    _table[dir] = _table[dir] || {};
    _table[dir].hidden = false;
    return true;
  };

  /**
    * Check if a file or a directory is hidden
    * @param {string} file
    * @return {boolean}
    */
  this.is_hidden = function(dir) {
    if(!_table[dir = normalize(dir)])
    return false;

    return !!table[dir].hidden;
  };

  /**
    * Go to a directory or get the current
    * @param {string} [dir]
    * @return {string}
    */
  this.chdir = function(dir) {
    if(typeof dir === 'undefined')
      return (_chdir.substr(0, 1) === '/' ? _chdir : '/' + _chdir);

    dir   = normalize(dir, true);
    var e = this.dirExists(dir);
    if(e) { _chdir = dir; }
    return e;
  };

  /**
    * Get or set a state
    * @param {string} name
    * @param {*} value
    * @return {*}
    */
  this.state = function(name, value) {
    if(typeof value !== 'undefined')
      _states[name] = clone(value);

    return clone(_states[name]);
  };

  /**
    * Check if the server is connected to a specific network
    * @param {string} name
    * @return {number|void} Network bandwidth
    */
  this.network = function(name) {
    return _netwk.hasOwnProperty(name) && _netwk[name].speed;
  };

  /**
    * Import a directory
    * @param {object} folder
    * @param {string} [path] Importation path
    * @return {boolean}
    */
  this.importFolder = function(folder, path) {
    if(typeof folder !== 'object' || !folder || Array.isArray(folder)
    || typeof folder.path !== 'string' || typeof folder.folder !== 'object' || !folder.folder || Array.isArray(folder)
    || typeof folder.table !== 'object' || !folder.table || Array.isArray(folder.table))
       return false;

    folder   = clone(folder);
    var path = normalize(path || folder.path);

    if(this.dirExists(path))
      this.removeTree(path);
    else if(this.fileExists(path))
      this.removeFile(path);

    var success = _fs(path, 'object', folder.folder), keys = Object.keys(folder.table);

    for(var i = 0; i < keys.length; i++)
      _table[path + '/' + keys[i]] = folder.table[keys[i]];

    return true;
  };

  /**
    * Export a directory
    * @param {string} path
    * @return {boolean|object}
    */
  this.exportFolder = function(path) {
    var folder = _fs(path = normalize(path), 'object');

    if(!folder)
      return false;

    var table = {}, keys = Object.keys(_table);

    for(var i = 0; i < keys.length; i++)
      if(keys[i].substr(0, path.length + 1) === path + '/' || keys[i] === path)
        table[keys[i].substr(path.length + 1)] = _table[keys[i]];

    return clone({
      path  : path  ,
      folder: folder,
      table : table
    });
  };

  /**
    * Import a server from data
    * @param {object} data
    * @param {string} [somewhere] Import just a part of data (see @export)
    */
  this.import = function(data, somewhere) {
    data   = clone(data);

    if(!somewhere) {
      _table  = data.table;
      _files  = data.files;
      _chdir  = data.chdir || '/';
      _states = data.states;
      _netwk  = data.netwk;
      sep     = data.sep   || '/';
    } else {
      if(somewhere === 'files')
        _files  = data;
      else if(somewhere === 'table')
        _table  = data;
      else if(somewhere === 'states')
        _states = data;
      else if(somewhere === 'networks')
        _netwk  = data;
      else if(somewhere === 'sep')
        sep     = data;
      else
        return false;
    }

    data   = null; // Free memory
  };

  /**
    * Import a server from data
    * @param {object} data
    * @param {string} [somewhere] Import just a part of data (see @export)
    * @return {boolean}
    */
  this.importJSON = function(data, somewhere) {
    try { data = JSON.parse(data); }
    catch(e) { return false; }

    this.import(data, somewhere);
    return true;
  };

  /**
    * Export the server as data
    * @param {string} [something] Export just one thing
    * @return {object} data
    */
  this.export = function(something) {
    if(!something)
    return {
      table  : _table,
      files  : _files,
      chdir  : _chdir,
      states : _states,
      netwk  : _netwk,
      sep    : sep
    };

    if(something === 'table')
      return clone(_table);
    else if(something === 'files')
      return clone(_files);
    else if(something === 'states')
      return clone(_states);
    else if(something === 'networks')
      return clone(_netwk);
    else if(something === 'sep')
      return clone(sep);

    return false;
  };

  /**
    * Export the server as data (JSON plain text)
    * @param {string} [something] Export just one thing
    * @return {string}
    */
  this.exportJSON = function(something) {
    var ret = this.export(something);
    return ret ? JSON.stringify(ret) : ret;
  };

  /**
    * Perform a search on the server
    * @param {string} query Glob search
    * @param {array} [options]
    * @return {array}
    */
  this.glob = function(query, options, storage, _path, results, searchArgs) {

    /* === OPTIONS ===
     * sub_folders
     * exclude_files
     * exclude_folders
     * only_files
     * only_folders
     * names_list
     * add_folders_slash
     * relative_path:...
     */

    if(Array.isArray(options) || !options) {
      options = options || [];
      var f = {};

      for(var i = 0; i < options.length; i++) {
        if(options[i].substr(0, 14) === 'relative_path:')
          f.relative_path = normalize(options[i].substr(14), true) + '/';
        else if(options[i] === 'relative_path')
          f.relative_path = (_chdir === '/' ? '/' : _chdir + '/');
        else
          f[options[i]] = true;
      }

      options = f;
    }

    // Query to Regexp
    function q2r(str) {
      return new RegExp('^' + str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&").replace(/\\\*/g, '(.*?)').replace(/\\\?/g, '(.)') + '$');
    }

    if(!results)
      // First call of the function
      query = normalize(query, true).substr(1).split(sep);
    else
      // Not the first call
      query = normalize(query).split(sep);

    var store      = storage || _files, i,
        _path      = _path || '',
        begpath    = (_path.substr(0, 1) === '/' ? _path : '/' + _path) + (_path.length ? '/' : ''),
        files, saw = [],
        results    = results || [],
        regex, match, tmp;

    searchArgs = searchArgs || [];

    if(query[0].indexOf('*') !== -1 || query[0].indexOf('?') !== -1) {
      // query's part is a regex
      files = Object.keys(store), regex = q2r(query[0]);

      for(i = 0; i < files.length; i++) {
        if(match = files[i].match(regex)) {
          // if the regex match with the file's name
          if(query.length > 1) {
            // if there are some other parts
            saw.push(options.names_list ? (options.relative_path ? begpath.substr(options.relative_path.length) : begpath) + files[i] + (tmp && options.add_folders_slash ? '/' : '') : files[i]);

            if(!_table[begpath + files[i]] || (_table[begpath + files[i]] && _table[begpath + files[i]].hidden && options.show_hidden) || (!_table[begpath + files[i]].hidden))
              this.glob(query.slice(1).join(sep), options, store[files[i]], begpath + files[i], results, searchArgs.concat(match.slice(1)));
          } else {
            // if that's the end of the query
            if(!_table[begpath + files[i]] || (_table[begpath + files[i]] && _table[begpath + files[i]].hidden && options.show_hidden) || (!_table[begpath + files[i]].hidden))
              if((tmp = this.dirExists(begpath + files[i]) && !options.only_files && !options.exclude_folders) || (this.fileExists(begpath + files[i]) && !options.only_folders && !options.exclude_files))
                results.push(options.names_list ? (options.relative_path ? begpath.substr(options.relative_path.length) : begpath) + files[i] + (tmp && options.add_folders_slash ? '/' : '') : {path: begpath + files[i] + (tmp && options.add_folders_slash ? '/' : ''), vars:searchArgs.concat(match.slice(1)), type: !tmp*1});
          }
        }
      }
    } else {
      // query's part is a simple file name
      if(store.hasOwnProperty(query[0])) {
        // it exists !
        if(query.length > 1) {
          // if there are some other parts
          if(typeof store[query[0]] === 'object') {
            // that's a folder
            saw.push(query[0]);

            if(!_table[begpath + query[0]] || (_table[begpath + query[0]] && _table[begpath + query[0]].hidden && options.show_hidden) || (!_table[begpath + query[0]].hidden))
              this.glob(query.slice(1).join(sep), options, store[query[0]], begpath + query[0], results, searchArgs);
          } else {
            // that's a file
            if(!_table[begpath + query[0]] || (_table[begpath + query[0]] && _table[begpath + query[0]].hidden && options.show_hidden) || (!_table[begpath + query[0]].hidden))
              if((tmp = this.dirExists(begpath + query[0]) && !options.only_files && !options.exclude_folders) || (this.fileExists(begpath + query[0]) && !options.only_folders && !options.exclude_files))
                results.push(options.names_list ? (options.relative_path ? begpath.substr(options.relative_path.length) : begpath) + query[0] + (tmp && options.add_folders_slash ? '/' : '') : {path: begpath + query[0] + (tmp && options.add_folders_slash ? '/' : ''), vars:searchArgs, type: !tmp*1});
          }
        } else {
          // if that's the end of the query
          if(!_table[begpath + query[0]] || (_table[begpath + query[0]] && _table[begpath + query[0]].hidden && options.show_hidden) || (!_table[begpath + query[0]].hidden))
            if((tmp = this.dirExists(begpath + query[0]) && !options.only_files && !options.exclude_folders) || (this.fileExists(begpath + query[0]) && !options.only_folders && !options.exclude_files))
              results.push(options.names_list ? (options.relative_path ? begpath.substr(options.relative_path.length) : begpath) + query[0] + (tmp && options.add_folders_slash ? '/' : '') : {path: begpath + query[0] + (tmp && options.add_folders_slash ? '/' : ''), vars:searchArgs, type: !tmp*1});
        }
      }
    }

    if(options.sub_folders) {
      if(!files) { files = Object.keys(store); }

      for(i = 0; i < files.length; i++) {
        if(typeof store[files[i]] === 'object' && saw.indexOf(files[i]) === -1)
          if(!_table[begpath + files[i]] || (_table[begpath + files[i]] && _table[begpath + files[i]].hidden && options.show_hidden) || (!_table[begpath + files[i]].hidden))
            this.glob(query.join(sep), options,store[files[i]], begpath + files[i], results, searchArgs);
      }
    }

    saw = storage = store = searchArgs = null; // free memory
    return results;
  };

  /**
    * Normalize a path
    * @param {string} p
    * @param {boolean} [cwd]
    * @return {string}
    */
  this.normalize = function(p, cwd) {
    return normalize(p, cwd);
  };

  /**
    * Export of the `clone` function
    * @param {*} input
    * @return {*}
    */
  this.clone = function(input) {
    return clone(input);
  };

  /**
    * Catch an event
    * @param {string} name
    * @param {function} callback
    * @param {string} [ID] Callback ID. If omitted, random ID
    * @return {string|boolean} Callback ID or false if failed
    */
  this.catch = function(name, callback, ID) {
    ID = ID || generateId();

    if((_events[name] && _events[name][ID]) || typeof callback !== 'function')
      return false;

    if(!_events.hasOwnProperty(name))
      _events[name] = {};

    // Server allows only one catcher for 'incoming' event
    if(name.substr(0, 9) === 'incoming:' && Object.keys(_events.incoming).length)
      return false;

    _events[name][ID] = callback;
    return true;
  };

  /**
    * Uncatch an event
    * @param {string} name
    * @param {string} [ID] Callback ID. If omitted, will remove all callbacks for this event
    * @return {boolean}
    */
  this.uncatch = function(name, callback, ID) {
    if(!_events.hasOwnProperty(name) || (ID && !_events[name][ID]))
      return false;

    if(ID)
      delete _events[name][ID];
    else
      _events[name] = {};
  };

  /**
    * Make a request on the server
    * @param {object} request
    * @param {function} callback
    * @return {string|void}
    */
  this.request = function(request, callback) {
    if(typeof request.port === 'string')
      request.port = parseInt(request.port);

    if(typeof callback !== 'function')
      return 'Bad callback';

    if(typeof request.url !== 'string')
      return 'Bad request, url is not valid';

    if(typeof request.headers !== 'object' || !request.headers || Array.isArray(request.headers))
      return 'Bad request, headers are not valid';

    if(typeof request.port !== 'number' || Number.isNaN(request.port))
      return 'Bad request, port is not valid';

    if(typeof request.network !== 'string')
      return 'Bad request, network is not valid';

    if(typeof request.client !== 'string')
      return 'Bad request, client is not valid';

    // If server is not connected to the request's network
    if(!_netwk.hasOwnProperty(request.network))
      return 'Server is not connected to this network';

    request = clone(request);
    request.id = generateId();

    // If there is no catcher, this port is not opened
    if(!_events['incoming:' + request.port])
      return 'Port ' + request.port + ' is not opened';

    var names = Object.keys(_events['incoming:' + request.port]), response = new this.response(request, callback);
    var index = request.url.indexOf('?'); request.data = {};

    if(index !== -1) {
      request.data = (function(query) {
        var result = {};
        query.split('&').forEach(function(part) {
          var item = part.split("=");
          result[item[0]] = decodeURIComponent(item[1]);
        });
        return result;
      })(request.url.substr(index + 1));

      request.url = request.url.substr(0, index);
    }

    console.log(request);

    _events['incoming:' + request.port][names[0]](request, response);

    return ;
  };

  /**
    * Download a file
    * @param {object} params IP, url, headers, network, port, data, progress, error, success
    */
  this.download = function(params) {
    if(!_netwk.hasOwnProperty(params.network || 'hypernet'))
      return params.error("Server is not connected to this network");

    if(!servers.hasOwnProperty(params.IP))
      return params.error("Failed to connect to server : IP not found");

    var content = '', finished = false, keys, query = '', i;

    if(params.data) {
      keys = Object.keys(params.data);
      for(i = 0; i < keys.length; i++)
        query += '&' + keys[i] + '=' + encodeURIComponent(params.data[keys[i]]);
      params.url += '?' + query.substr(1);
    }

    var d = Date.now(), c = 0, speed, r, received = 0;

    var error = servers[params.IP].request({
      url      : params.url,
      headers  : params.headers || {},
      network  : params.network || 'hypernet',
      client   : _ip,
      bandwidth: this.network('hypernet'),
      port     : params.port || 80
    }, function(packet) {
      c        += packet.final ? packet.content.length : packet.size;
      received += 1;
      content  += packet.content;
      speed     = (c / (Date.now() - d) * 1000).toFixed(2);
      r         = new Date(0); r.setSeconds((packet.total - received) * packet.size / speed);

      if(params.progress)
        params.progress(packet.number / packet.total, packet.number, packet.total, speed, (r.getHours() - 1 > 0 ? r.getHours() - 1 + ':' : '') + (r.getMinutes() < 10 ? '0' : '') + r.getMinutes() + ':' + (r.getSeconds() < 10 ? '0' : '') + r.getSeconds());

      if(packet.final && !finished) {
        finished = true;

        if(packet.headers.code === 200)
          params.success(content, {
            speed: speed,
            time : Date.now() - d,
            size : c/*(packet.total - 1) * packet.size + packet.content.length*/
          });
        else {
          packet.received = content;
          params.error(tr('Error: Server returned status ${status}', [packet.headers.code]) + '\n' + content, packet);
        }
      }
    });

    if(error)
      params.error(tr('Failed to connect to server') + '\n' + tr(error));
  };

  /**
    * Generate a random ID
    * @return {string}
    */
  this.generateId = function() { return generateId(); };

  /**
    * Generate a random string
    * @param {number} [length] String length. Default: 10
    * @return {string}
    */
  this.randomString = function(length) {
    var p = '';

    for(var g = 0; g < (length || 30); g++)
      p += String.fromCharCode(Math.floor(Math.random() * 256));

    return p.replace(/\n| /g,String.fromCharCode(256));
  };

  /**
    * Generate a random password
    * @param {number} [length] String length. Default: 10
    * @return {string}
    */
  this.randomPassword = function(length) {
    var p = '', allowedChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_()[]{}°@/*++~';

    for(var g = 0; g < (length || 30); g++)
      p += allowedChars.substr(Math.floor(Math.random() * allowedChars.length), 1);

    return p;
  };

  /**
    * Get the server's ID
    * @return {string}
    */
  this.id = function() { return id; };
  var  id = generateId();

  /* Make aliases */
  this.mkdir = this.makeDir;
  this.ls    = this.readDir;
  this.on    = this.catch  ;
  this.off   = this.uncatch;

  /* Classes */

  this.response  = function(request, onEnd) {
    var sending, content, packets, sendI, bandwidth = fastdev ? 16384 : Math.min(_netwk[request.network].speed, request.bandwidth);

    this.end     = function() {
      sending = -1;

      this.headers['Content-Length'] = this.content.length;
      this.size = (packetSize > bandwidth / 8) ? bandwidth / 8 : packetSize;

      content = this.content;

      if(this.content.length !== 0) {
        packets = Math.floor(content.length / this.size);

        if(packets !== content.length / this.size)
          packets += 1;
      } else
        packets = 1;

      delete this.content;

      this.total = packets;

      sendI = setInterval(function(response) {
        response.sendNext();
      }, 1000 * this.size / bandwidth, this);
    };

    this.sendNext = function() {
      if(typeof sending !== 'number')
        return false;

      sending++;

      this.content = content.substr(this.size * sending, this.size);
      this.number  = sending + 1;

      if(sending + 1 === packets) {
        // last packet
        this.final = true;
        clearInterval(sendI);
      }

      onEnd(this);
    };

    this.headers = {};
    this.content = '';
  };

  /* Freeze the server's instance */
  Object.freeze(this);

}});
