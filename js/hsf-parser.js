'use strict';

var HSF = (new (function() {

  /**
    * Parse a HSF code
    * @param {string} code
    * @param {object} [makeScriptScope] Returns an instance of HSF.Script with this scope (default: false)
    * @return {Array|Error}
    */

  this.parse = function(code, makeScriptScope) {
    var out = [];
    code = code.split('\n');

    for(var i = 0; i < code.length; i++) {
      if(code[i] && code[i].trim().substr(0, 1) !== '#') {
        try      { out.push(math.compile(code[i].replace(/#(.*)$/, ''))); }
        catch(e) { return e; }
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

    var i = -1;

    /**
      * Run the next instruction
      * @return {void|object}
      */
    this.next = function() {
        i++; // Next line

        if(i >= code.length) // Script has been entirely runned
          return ;

        try      { code[i].eval(scope); }
        catch(e) { return {line: i + 1, view: code[i], error: e}; }
    };

    /**
      * Run all the script
      * @return {void|object}
      */
    this.run = function() {
      var ret;

      while(i < code.length) {
        ret = this.next();

        if(ret)
          return ret;
      }
    };

    /**
      * Ignore the next instruction
      */
    this.pass = function() {
      i++;
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
      * Get the current step
      * @return {void|object}
      */
    this.current = function() {
      return code[i];
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
