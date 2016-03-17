'use strict';

var Server = function() {

  var _chdir  = '/',
    sep   = '/',
    _table  = {},
    _files  = {};

  /**
    * Clone an object
    * @param {object} oReferance
    * @return {object}
    */
  var clone = function(oReferance) {
    var aReferances = new Array();
    var getPrototypeOf = function(oObject) {
    if(typeof(Object.getPrototypeOf)!=="undefined") return Object.getPrototypeOf(oObject);
    var oTest = new Object();
    if(typeof(oObject.__proto__)!=="undefined"&&typeof(oTest.__proto__)!=="undefined"&&oTest.__proto__===Object.prototype) return oObject.__proto__;
    if(typeof(oObject.constructor)!=="undefined"&&typeof(oTest.constructor)!=="undefined"&&oTest.constructor===Object&&typeof(oObject.constructor.prototype)!=="undefined") return oObject.constructor.prototype;
    return Object.prototype;
    };
    var recursiveCopy = function(oSource) {
    if(typeof(oSource)!=="object") return oSource;
    if(oSource===null) return null;
    for(var i=0;i<aReferances.length;i++) if(aReferances[i][0]===oSource) return aReferances[i][1];
    var Copy = new Function();
    Copy.prototype = getPrototypeOf(oSource);
    var oCopy = new Copy();
    aReferances.push([oSource,oCopy]);
    for(var sPropertyName in oSource) if(oSource.hasOwnProperty(sPropertyName)) oCopy[sPropertyName] = recursiveCopy(oSource[sPropertyName]);
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
    * @return {string}
    */
  function normalize(input) {
    if(!input)
    return '';

    var parts = input.split(/\\|\//), out = [];

    for(var i = 0; i < parts.length; i++) {
    if(parts[i] !== '.' && parts[i].length) {
      if(parts[i] === '..' && out.length)
      out.pop();
      else if(parts[i] !== '..')
      out.push(parts[i]);
    }
    }

    return out.join(sep);
  }

  /**
    * Perform an action on the filesystem
    * @param {string} _path
    * @param {string} type
    * @param {string} [write]
    * @return {boolean|object}
    */
  function _fs(_path, type, write) {
    var path = normalize(_path);

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

    if(typeof ({})[path[i]] !== 'undefined')
      path[i] = '___' + path[i];

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
    return !!_fs(file, 'string');
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
    * Write a file
    * @param {string} file
    * @param {*} content
    */
  this.writeFile = function(file, content) {
    if(this.dirExists(file))
      return false;

    var ret = _fs(file, 'string', asPlain(content));
    if(ret) { _table[normalize(file)].edited = (new Date()).getTime(); }
    return ret;
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
    var ret = _fs(file, 'string', false);
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
    * @return {boolean|array}
    */
  this.readDir = function(dir) {
    var d = _fs(dir, 'object');
    if(!d) return false;

    return Object.keys(d);
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
    if(!this.dirExists(dir))
    return "Directory not found";

    return _fs(dir, 'object', false) ? false : "Failed to remove directory";
  };

  /**
    * Make a file tree from directory
    * @param {string} dir
    * @return {boolean|object}
    */
  this.tree = function(dir) {
    if(!this.dirExists(dir))
    return false;

    var items = this.ls(dir = dir || ''), r = {};

    for(var i = 0; i < items.length; i++) {
    if(this.dirExists(dir + '/' + items[i]))
      r[items[i]] = this.tree(dir + '/' + items[i]);
    else
      r[items[i]] = 1;
    }

    return r;
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
    if(typeof dir === 'undefined') return _chdir || '/';
    dir   = normalize(dir);
    var e = this.dirExists(dir);
    if(e) { _chdir = dir; }
    return e;
  };

  /**
    * Import a server from data
    * @param {string} somewhere Import just a part of data (see @export)
    * @param {object} data
    */
  this.import = function(data, somewhere) {
    data   = clone(data);

    if(!somewhere) {
    _table = data.table;
    _files = data.files;
    _chdir = data.chdir || '/';
    sep  = data.sep   || '/';
    } else {
    if(somewhere === 'files')
      _files = data;
    else if(somewhere === 'table')
      _table = data;
    else if(somewhere === 'sep')
      sep  = data;
    }

    data   = null; // Free memory
  };

  /**
    * Export the server as data
    * @param {string} something Export just one thing
    * @return {object} data
    */
  this.export = function(something) {
    if(!something)
    return {
      table: _table,
      files: _files,
      chdir: _chdir,
      sep  : sep
    };

    if(something === 'table')
    return clone(_table);
    else if(something === 'files')
    return clone(_files);
    else if(something === 'sep')
    return clone(sep);

    return ;
  };

  /**
    * Perform a search on the server
    * @param {string} query Glob search
    * @param {boolean} subDirectories Search into all sub-directories
    * @return {array}
    */
  this.glob = function(query, subDirectories, showHidden, storage, _path, results, searchArgs) {

    // Query to Regexp
    function q2r(str) {
      return new RegExp('^' + str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&").replace(/\\\*/g, '(.*?)').replace(/\\\?/g, '(.)') + '$');
    }

    var store    = storage || _files, i,
      _path    = _path || '',
      query    = normalize(query).split(sep),
      begpath  = _path + (_path.length ? '/' : ''),
      files, saw = [],
      results  = results || [],
      regex, match;

      searchArgs = searchArgs || [];

    if(query[0].indexOf('*') !== -1 || query[0].indexOf('?') !== -1) {
    // query's part is a regex
    files = Object.keys(store), regex = q2r(query[0]);

    for(i = 0; i < files.length; i++) {
      if(match = files[i].match(regex)) {
      // if the regex match with the file's name
      if(query.length > 1) {
        // if there are some other parts
        saw.push(files[i]);

        if(!_table[begpath + files[i]] || (_table[begpath + files[i]] && _table[begpath + files[i]].hidden && showHidden) || (!_table[begpath + files[i]].hidden))
        this.glob(query.slice(1).join(sep), subDirectories, showHidden, store[files[i]], begpath + files[i], results, searchArgs.concat(match.slice(1)));
      } else {
        // if that's the end of the query
        if(!_table[begpath + files[i]] || (_table[begpath + files[i]] && _table[begpath + files[i]].hidden && showHidden) || (!_table[begpath + files[i]].hidden))
        results.push({path: begpath + files[i], vars:searchArgs.concat(match.slice(1))});
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

        if(!_table[begpath + query[0]] || (_table[begpath + query[0]] && _table[begpath + query[0]].hidden && showHidden) || (!_table[begpath + query[0]].hidden))
        this.glob(query.slice(1).join(sep), subDirectories, showHidden, store[query[0]], begpath + query[0], results, searchArgs);
      } else {
        // that's a file
        if(!_table[begpath + query[0]] || (_table[begpath + query[0]] && _table[begpath + query[0]].hidden && showHidden) || (!_table[begpath + query[0]].hidden))
        results.push({path: begpath + query[0], vars:searchArgs});
      }
      } else {
      // if that's the end of the query
      if(!_table[begpath + query[0]] || (_table[begpath + query[0]] && _table[begpath + query[0]].hidden && showHidden) || (!_table[begpath + query[0]].hidden))
        results.push({path: begpath + query[0], vars:searchArgs});
      }
    }
    }

    if(subDirectories) {
    if(!files) { files = Object.keys(store); }

    for(i = 0; i < files.length; i++) {
      if(typeof store[files[i]] === 'object' && saw.indexOf(files[i]) === -1)
      if(!_table[begpath + files[i]] || (_table[begpath + files[i]] && _table[begpath + files[i]].hidden && showHidden) || (!_table[begpath + files[i]].hidden))
        this.glob(query.join(sep), subDirectories /* true */, showHidden, store[files[i]], begpath + files[i], results, searchArgs);
    }
    }

    saw = storage = store = searchArgs = null; // free memory
    return results;
  };

  /* Make aliases */
  this.mkdir = this.makeDir;
  this.ls  = this.readDir;

};
