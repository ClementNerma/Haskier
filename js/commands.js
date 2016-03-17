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
  }
};
