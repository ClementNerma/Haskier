'use strict';

var commands = {
  echo: {
    legend   : tr('Display a text'),
    arguments: [],
    callback : function(args) {
      display(args._.join(' '));
    }
  },

  /* Doesn't work ! */
  clear: {
    legend   : tr('Clear the console'),
    arguments: [],
    callback : function() {
      console.log(true);
      term.clear();
    }
  },

  name: {
    legend   : tr('Change username'),
    arguments: [
      {
        _       : 'name',
        legend  : tr('New name'),
        required: true
      }
    ],
    callback : function(name) {
      vars.name = name;
      updatePrompt();
    }
  },

  set: {
    legend   : tr('Set a variable\'s value'),
    arguments: [
      {
        _       : 'name',
        legend  : tr('Variable\'s name'),
        required: true
      },
      {
        _       : 'value',
        legend  : tr('Variable\'s value'),
        required : true
      }
    ],
    callback: function(name, value) {
      vars[name] = value;
    }
  },

  'force-save': {
    legend   : tr('Try to solve saves problems'),
    arguments: [],
    callback : function() {
      localStorage.clear();
    }
  },

  /* Secret command */
  hacker: {
    legend   : '?????????????',
    arguments: [],
    callback : function(args) {
      if(args._[0] === atob('SSdtIGEgaGFja2Vy')) {
        save = save || {}; save.tools = save.tools || {}; save.tools.hacker = (new Date().getTime());
        display('${b_red,f_cyan,italic:You\'re a hacker now !}');
      } else if(!save || !save.tools || !save.tools.hacker)
        return display('${b_red,f_white,italic:' + tr('You can\'t access this mysterious command.') + '}');

      try { display(asPlain((new Function([], args._.join(' '))()))); }
      catch(e) { display('${red:' + e.stack.split('\n').join('}\n${red:') + '}'); }
    }
  }
};
