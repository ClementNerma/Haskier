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
        regex   : /^([a-zA-Z0-9_]+)$/,
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

  ui: {
    legend   : tr('Set the terminal\'s appearance'),
    arguments: [
      {
        long    : 'font',
        legend  : tr('Font\'s name'),
        required: false
      }/*,
      {
        long    : 'show-infobar',
        legend  : tr('Show the information bar'),
        regex   : /^true|false$/,
        required: false
      }*/
    ],
    callback : function(font, showInfobar) {
      if(font) {
        if(font === 'reset') {
          delete save.data.font;
          display(tr('Font has been reset'));
        } else {
          var old = save.data.font || '${italic:<nothing>}';
          save.data.font = font;
          display(tr('Font has been changed from "${old}" to "${new}"', [old, font]));
        }
      }

      /*if(showInfobar)
        display(tr('The information bar has been ' + ((save.data.showInfobar = (showInfobar === 'true' || showInfobar === true)) ? 'unhidden' : 'hidden')))*/

      updateUI();
    }
  },

  help: {
    legend   : tr('Display help on commands'),
    arguments: [
      {
        _       : 'command',
        legend  : tr('Command\'s name'),
        required: false
      }
    ],
    callback : function(command) {
      if(command) {
        if(!commands.hasOwnProperty(command))
          return display('${red:' + tr('Command "${cmd}" was not found', [command]) + '}');

        var syn  = '',
            args = commands[command].arguments,
            desc = '',
            arg, req, asyn /* Argument synopsis */, adesc /* Argument description */;

        for(var i = 0; i < args.length; i++) {
          arg = args[i]; req = args[i].required; asyn = req ? '' : '[';

          /* Synopsis treatment */
          if(arg.short && arg.long)
            asyn += '-' + arg.short + '${bold:|}--' + arg.long;
          else if(arg.short)
            asyn += '-' + arg.short;
          else if(arg.long)
            asyn += '--' + arg.long;
          else
            asyn += '${italic:<' + arg._ + '>}';

          //if((arg.short || arg.long) && (arg.check || arg.regex || !arg.noValue))
            //asyn += ' = ...';

          syn += ' ' + asyn + (req ? '' : ']');

          /* Description treatment */
          desc += '\n\n\t${bold:' +
            (arg.short && arg.long ? '-' + arg.short + '|--' + arg.long :
              arg.short ? '-' + arg.short :
                arg.long ? '--' + arg.long :
                  '<' + arg._ + '>') +
                    (!req ? ' [Optionnal]' : '') +
                    '}\n\t\t' + arg.legend;
        }

        display('Description\n===========\n\n\t' + commands[command].legend + '\n\nSynopsis\n=========\n\n\t' + command + syn + '\n\n' + (desc ? 'Parameters\n==========' + desc : '\n${italic:' + tr('This command does not accept any parameter') + '.}'));
        return ;
      }

      // Display help on all commands
      var cmds = Object.keys(commands), long = 0, cmd;

      for(var i = 0; i < cmds.length; i++)
        long = Math.max(cmds[i].length, long);

      for(i = 0; i < cmds.length; i++) {
        cmd = commands[cmds[i]];
        display('${blue:' + cmds[i] + '}' + ' '.repeat(long - cmds[i].length) + ' ' + cmd.legend);
      }
    }
  },

  write: {
    legend   : tr('Write a file'),
    arguments: [
      {
        _       : 'file',
        legend  : tr('Filename'),
        required: true
      },
      {
        _      : 'content',
        legend  : tr('Content to write'),
        required: true
      }
    ],
    callback : function(file, content) {
      if(!server.writeFile(file, content))
        display_error('Failed to write file');
    }
  },

  read: {
    legend   : tr('Read a file'),
    arguments: [
      {
        _       : 'file',
        legend  : tr('Filename'),
        required: true
      },
      {
        long    : 'json',
        legend  : tr('Read the file as JSON object')
      }
    ],
    callback : function(file, json) {
      var content = server[json ? 'readJSON' : 'readFile'](file);

      if(typeof content !== 'string')
        display_error('Failed to read file' + (json ? ' as json' : ''));
      else
        display(content);
    }
  },

  rm: {
    legend   : tr('Remove a file or a folder'),
    arguments: [
      {
        _       : 'path',
        legend  : tr('Path'),
        required: true
      },
      {
        short   : 'f',
        long    : 'folder',
        legend  : tr('Allow folder removing')
      },
      {
        short   : 'r',
        long    : 'recursive',
        legend  : tr('Remove folder and all sub-folders')
      }
    ],
    callback: function(path, folder, recurse) {
      var res, nemp /* Not Empty */;

      if(!server.exists(path))
        return display_error(tr('File or folder not found'));

      if(server.dirExists(path) && !folder)
        return display_error(tr('This is a folder. To remove it, use -f option.'));

      if(server.fileExists(path) && folder)
        return display_error(tr('This is a file. To remove it, remove the -f option.'));

      if(server.dirExists(path)) {
        if(nemp = server.ls(path).length && !recurse)
          return display_error(tr('Folder is not empty. To remove it, use -r option.'));

        res = server[nemp ? 'removeTree' : 'removeDir'](path);

        if(res)
          display_error(tr(res));
      } else {
        res = server.removeFile(path);

        if(res)
          display_error(tr('Failed to remove file'));
      }
    }
  },

  cd: {
    legend   : tr('Change current directory'),
    arguments: [
      {
        _       : 'path',
        legend  : tr('Folder\'s path')
      }
    ],
    callback : function(path) {
      if(path) {
        if(server.chdir(path))
          updatePrompt();
        else
          display_error(tr('Directory not found'));
      } else
        display(server.chdir());
    }
  },

  ls: {
    legend   : tr('List the folder\'s content'),
    arguments: [
      {
        _       : 'path',
        legend  : tr('Folder\'s path. If omitted, read the server\'s root.')
      },
      {
        short   : 'd',
        long    : 'details',
        legend  : tr('Display details for each file and folder')
      },
      {
        short   : 'h',
        long    : 'hidden',
        legend  : 'Show hidden files and folders'
      }
    ],
    callback : function(path, details, hidden) {
      var list = server.ls(path, !!hidden);

      if(!list)
        return tr('Directory not found');

      if(!details) {
        display(list.join('\n'));
        return ;
      }

      var maxLength = 0;

      for(var i = 0; i < list.length; i += 1)
        if(list[i].length > maxLength)
          maxLength = list[i].length;

      for(i = 0; i < list.length; i += 1)
        display('${f_#90EE90:' + list[i] + '}' + ' '.repeat(maxLength - list[i].length) + ' ${f_#7FFFD4:' + (server.fileExists((path || '') + '/' + list[i]) ? 'file' : 'directory') + '}');
    }
  },

  mkdir: {
    legend   : tr('Create a folder'),
    arguments: [
      {
        _       : 'path',
        legend  : tr('Folder\'s path'),
        required: true
      }
    ],
    callback : function(path) {
      if(!server.mkdir(path))
        displayErr(tr('Failed to make folder'));
    }
  },

  com: {
    legend   : tr('Manage the communication services'),
    arguments: [
      {
        _       : 'state',
        legend  : tr('${cyan:open} Open the port, ${cyan:close} Close the port'),
        regex   : /^open|close$/,
        required: true
      }
    ],
    callback : function(state) {
      server.state('communication-opened', state === 'open');
      display(tr('Communication port') + ' ${cyan:' + (state === 'open' ? tr('opened') : tr('closed')) + '}');
    }
  },

  firewall: {
    legend   : tr('Manage the firewall'),
    arguments: [
      {
        _       : 'state',
        legend  : tr('${cyan:enable} Enable the firewall, ${cyan:disable} Disable the firewall'),
        regex   : /^enable|disable$/,
        required: true
      }
    ],
    callback : function(state) {
      server.state('firewall-opened', state === 'enable');
      display(tr('Firewall') + ' ${cyan:' + (state === 'enable' ? tr('enabled') : tr('disabled')) + '}');
    }
  },

  /* Secret command */
  hacker: {
    legend   : '?????????????',
    arguments: [],
    callback : function(args) {
      if(args._[0] === atob('SSdtIGEgaGFja2Vy')) {
        save.data.hacker = (new Date().getTime());
        display('${b_red,f_cyan,italic:You\'re a hacker now !}');
      } else if(!save.data.hacker)
        return display('${b_red,f_white,italic:' + tr('You can\'t access this mysterious command.') + '}');

      try { display(asPlain((new Function([], args._.join(' '))()))); }
      catch(e) { display('${red:' + e.stack.split('\n').join('}\n${red:') + '}'); }
    }
  }
};
