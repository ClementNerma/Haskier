'use strict';

var HSF = (new (function() {

  /**
    * Parse a HSF code
    * @param {string} code
    * @param {object} [makeScriptScope] Returns an instance of HSF.Script with this scope (default: false)
    * @return {Array|Error}
    */

  this.parse = function(code, makeScriptScope) {
    var out = [], match, j, line;
    code = code.split('\n');

    for(var i = 0; i < code.length; i++) {
      line = code[i].trim();
      if(line.length && line.substr(0, 2) !== '//' && line.substr(0, 2) !== '/*') {
        if(match = line.match(/^#include *\( *"([a-zA-Z0-9_\.\-]+)" *\)$/))
          out.push({include: match[1]});
        else if(match = line.match(/^: *([a-zA-Z0-9_]+)$/))
          out.push({label: match[1]});
        else if(match = line.match(/^: *([a-zA-Z0-9_]+) *(\-|=)> *(.*)$/))
          out.push({label: match[1], marker: match[3]});
        else if(match = line.match(/^(else *|)if *\((.*)\)$/)) {
          if(match[1])
            out.push({state: 'else'});
          out.push({js: /*'return ' + */match[2].replace(/\bis\b/g, '==').replace(/\bisnt\b/g, '!=='), state: 'if'});
        } else if(line === 'else')
          out.push({state: 'else'});
        else if(line === 'endif')
          out.push({state: 'endif'});
        else if(match = line.match(/^endif +x *([0-9]+)$/)) {
          for(j = 0; j < parseInt(match[1]); j++)
            out.push({state: 'endif'});
        } else {
          if(match = line.match(/^(scope\.|)([a-zA-Z0-9_\[\]\'\"]+) *= *([a-zA-Z0-9_\.]+) *\((.*)\)([; ]*)$/)) {
            out.push({js: match[3] + '(' + match[4] + ');'});
            out.push({js: (match[1] || 'scope.') + match[2] + '=scope.answer;', state: 'var-assign'});
          } else {
            out.push({js: line});

            if(match = line.match(/^(scope\.|)([a-zA-Z0-9_\[\]\'\"]+) *=(.*)$/)) {
              out[out.length - 1].state = 'var-assign';

              if(!match[1])
                out[out.length - 1].js = 'scope.' + out[out.length - 1].js;
            }

            if((line.substr(0, 1) === "'" && line.substr(0, 1) === line.substr(line.length - 1, 1))
            || (line.substr(0, 1) === '"' && line.substr(0, 1) === line.substr(line.length - 1, 1)))
              out[out.length - 1].event = 'display';
          }
        }
      }
    }

    return makeScriptScope ? new this.Script(out, makeScriptScope || {}) : out;
  };

  /**
    * Script constructor
    * @param {string|Array} code Plain or parsed code
    * @param {object} [scope]
    * @constructor
    */
  this.Script = function(code, scope) {

    if(typeof code === 'string') {
      code = this.parse(code);

      if(!Array.isArray(code))
        this.error = code;
    }

    /**
      * HSF scope
      * @type {object}
      */
    var scope = typeof scope === 'object' && scope && !Array.isArray(scope) ? scope : {};
    var conds = [], events = {}, _label = null, diff = Object.keys(scope);

    var i = -1;

    /**
      * Attach a callback to an event
      * @param {string} name
      * @param {function} callback
      */
    this.event = function(name, callback) {
      events[name] = callback;
    };

    /**
      * Run the next instruction
      * @return {void|object}
      */
    this.step = function() {
        i++; // Next line

        if(i >= code.length) // Script has been entirely runned
          return ;

        // If this line is a label
        if(code[i].label) {
          // If there is a #label catcher
          if(events.label)
            // Call it
            events.label(code[i].label, code[i].marker, i, code);

          // Store in memory the label's name
          _label = code[i].label;
          // ... and run the next instruction
          return this.step();
        }

        // If this line is an include
        if(code[i].include) {
          // If there is no #inclde catcher
          if(!events.include) {
            // ERROR
            var err = new Error('Failed to include file "' + code[i].include + '" because no #include catcher is present');
            console.error(err);
            return err;
          }

          // Call the #include catcher for getting the file's content
          var content = events.include(code[i].include);

          // If a string is returned, that's a plain code
          if(typeof content === 'string')
            // So we've to parse it
            content = this.parse(content);
          else
          // If that's a script instance
          if(content instanceof HSF.Script)
            // We get its lines
            content = content.getCode();
          else {
            // Here, that's not a parsed content, so the returned value is wrong
            // ERROR
            var err = new Error('#include catcher returned a bad value for file "' + code[i].include + '"');
            console.error(err);
            return err;
          }

          // Insert the file's content here
          code.splice.apply(code, [i, 1].concat(content));
          go();
          return ;
        }

        var line = code[i], _scope = [], keys = Object.keys(scope), vals = [];

        for(var j = 0; j < keys.length; j++)
          _scope.push(scope[keys[j]]);

        try { var func = (new Function(keys, 'return ' + line.js)), ret; }
        catch(e) { console.error('JS running has failed. Line: ' + line.js + '\nDetails :\n' + e.stack); }

        if(line.state === 'if')
          conds.push(conds.indexOf(false) === -1 ? !!func.apply(window, _scope) : null);
        else if(line.state === 'else')
          conds[conds.length - 1] = !conds[conds.length - 1];
        else if(line.state === 'endif')
          conds.pop();
        else if(conds.indexOf(false) === -1) {
          ret = func.apply(window, _scope);

          if(line.event && events[line.event])
            events[line.event](ret, i, code[i]);
        } else if(!line.state)
          this.step()

        if(line.state)
          this.step();
    };

    /**
      * Alias : When @step is called, all functions are executed one by one
      */
    this.run = this.step;

    /**
      * Ignore the next instruction
      */
    this.pass = function() {
      i++;

      if(code[i] && code[i].label) {
        _label = code[i].label;

        if(events.label)
          events.label(code[i].label, code[i].marker, i, code);
      }
    };

    /**
      * Get the current label
      * @return {string|void}
      */
    this.label = function() {
      return _label;
    };

    /**
      * Repeat the current label
      * @return {boolean}
      */
    this.repeatLabel = function() {
      return _label ? this.goLabel(_label) : false;
    };

    /**
      * Go to the next label
      * @return {boolean}
      */
    this.nextLabel = function() {
      var f = false;

      for(var j = i + 1; j < code.length; j++) {
        if(code[j].label) {
          i = j; f = true; break;
        }
      }

      if(i === j && i < code.length - 1) {
        _label = code[j].label;

        if(events.label)
          events.label(code[j].label, i, code[i]);

        return true;
      } else
        return false;
    };

    /**
      * Restart the script execution's
      */
    this.restart = function() {
      this.goLine(0);
      this.run();
    };

    /**
      * Go the first step
      */
    this.beginning = function() {
      this.goLine(0);
    };

    /**
      * Go to a label
      * @param {string} name
      */
    this.goLabel = function(name) {
      var f = false;

      for(var j = 0; j < code.length; j++) {
        if(code[j].label && code[j].label === name) {
          i = j; f = true; break;
        }
      }

      if(i === j && i < code.length - 1) {
        _label = name;

        if(events.label)
          events.label(name, code[j].marker, i, code[i]);

        return true;
      } else return false;
    };

    /**
      * Get a label's marker
      * @param {string} name
      * @return {void|boolean|string}
      */
    this.getLabelMarker = function(name) {
      var f = false;

      for(var j = 0; j < code.length; j++) {
        if(code[j].label && code[j].label === name) {
          f = j; break;
        }
      }

      if(f === j)
        return code[j].marker;
      else
        return false;
    };

    /**
      * Get current's label's marker
      * @return {void|string}
      */
    this.marker = function() {
      return _label ? this.getLabelMarker(_label) : undefined;
    };

    /**
      * Get the current step
      * @param {number} [further]
      * @return {void|object}
      */
    this.current = function(further) {
      return code[i + (further || 0)];
    };

    /**
      * Get the current step's number
      * @return {number}
      */
    this.currentStep = function() {
      return i;
    };

    /**
      * Change current step
      * @param {number} step
      * @return {boolean}
      */
    this.goLine = function(step) {
      if(step >= code.length)
        return false;

      i = step;
      return true;
    };

    /**
      * Get a variable
      * @param {string} name
      * @return {*}
      */
    this.getVar = function(name) {
      return scope[name];
    };

    /**
      * Set a variable
      * @param {string} name
      * @param {*} value
      */
    this.setVar = function(name, value) {
      scope[name] = value;
    };

    /**
      * Delete a variable
      * @param {string} name
      * @return {boolean}
      */
    this.delVar = function(name) {
      return (delete scope[name]);
    };

    /**
      * Get the entire scope
      * @return {object}
      */
    this.getScope = function() {
      return scope;
    };

    /**
      * Get the code
      * @return {array}
      */
    this.getCode = function() {
      return code;
    };

    /**
      * Check if the script is finished
      * @return {boolean}
      */
    this.finished = function() {
      return (i >= code.length - 1);
    };

    /**
      * Get the scope's modification from the script's beginning
      * @return {object}
      */
    this.diffScope = function() {
      if(!diff.length)
        return scope;

      var dffs = {} /* Differenciation Scope */, keys = Object.keys(scope);

      for(var i = 0; i < keys.length; i++)
        if(diff.indexOf(keys[i]) === -1)
          dffs[keys[i]] = scope[keys[i]];

      return dffs;
    };
  };

  /**
    * Run a HSF code
    * @param {string} code
    * @param {object} [scope] HSF Scope
    * @return {void|Error}
    */
  this.run = function(code, scope) {
    var script = this.parse(code, scope || true);

    if(script.error)
      return new Error(script.error);

    return script.run();
  };

})());
