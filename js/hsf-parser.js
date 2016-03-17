'use strict';

var HSF = (new (function() {

  /**
    * Parse a HSF code
    * @param {string} code
    * @return {Array|Error}
    */
  this.parse = function(code) {
    var out = [];
    code = code.split('\n');

    for(var i = 0; i < code.length; i++) {
      if(code[i] && code[i].trim().substr(0, 1) !== '#') {
        try      { out.push(math.compile(code[i].replace(/#(.*)$/, ''))); }
        catch(e) { return e; }
      }
    }

    return out;
  };

  /**
    * Run a code
    * @param {string|Array} code Plain or parsed code
    * @return {boolean|Error}
    */
  this.run = function(code) {
    if(typeof code === 'string') {
      var ret = this.parse(code);

      if(!Array.isArray(code))
        return code;
    }

    for(var i = 0; i < code.length; i++) {
      try      { code[i].eval(this.scope); }
      catch(e) { return {line: i + 1, view: code[i], e: e}; }
    }

    return false;
  };

  /**
    * HSF scope
    * @type {object}
    */
  this.scope = {
    print: function(text) {
      display(text);
    },

    clear: function() {
      term.clear();
    }
  };

})());
