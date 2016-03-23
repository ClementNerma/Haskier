'use strict';

/**
  * Some helpful regex
  * @type {object}
  */
var RegexCollection = {
  IP             : /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  Boolean        : /^true|false$/,
  AlphaNumeric   : /^[a-zA-Z0-9_]$/,
  AlphaNumeric_  : /^[a-zA-Z0-9_]+$/,
  Integer        : /^(\-|)([0-9]*)$/,
  PositiveInteger: /^[1-9]([0-9]*)$/,
  Number         : /^([0-9\.]+)$/
};

/**
  * Commands that are common to ALL servers
  * @type {object}
  */
var _commands = {
  echo: {
    legend   : tr('Display a text'),
    arguments: [],
    inputflux: true,
    callback : function(cmd) {
      display(typeof cmd.$add === 'string' ? cmd.$add : cmd._.join(' '));
    }
  },

  clear: {
    legend   : tr('Clear the console'),
    arguments: [],
    callback : function() {
      term.clear();
    }
  },

  name: {
    legend   : tr('Change username'),
    arguments: [
      {
        _       : 'name',
        legend  : tr('New name'),
        regex   : RegexCollection.AlphaNumeric_,
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
    },
    visible  : false
  },

  ui: {
    legend   : tr('Set the terminal\'s appearance'),
    arguments: [
      {
        long    : 'font',
        legend  : tr('Font\'s name')
      },
      /*{
        long    : 'show-infobar',
        legend  : tr('Show the information bar'),
        regex   : /^true|false$/,
        required: false
      }*/
      {
        long    : 'writing-speed',
        legend  : tr('Human\'s writing speed'),
        regex   : RegexCollection.PositiveInteger
      },
      {
        long    : 'line-waiting',
        legend  : tr('Waiting time before displaying each line'),
        regex   : RegexCollection.PositiveInteger
      }
    ],
    callback : function(font, writingSpeed, lineWaiting) {
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

      if(writingSpeed)
        save.data.writingSpeed = writingSpeed;

      if(lineWaiting)
        save.data.lineWaiting = lineWaiting;

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
                    (!req ? ' [' + tr('optionnal') + ']' : '') +
                    '}\n\t\t' + (arg.legend || '${f_grey,italic:' + tr('No description provided') + '}');
        }

        display('Description\n===========\n\n\t' + commands[command].legend + '\n\nSynopsis\n=========\n\n\t' + command + syn + '\n\n' + (desc ? 'Parameters\n==========' + desc : '\n${italic:' + tr('This command does not accept any parameter') + '.}'));
        return ;
      }

      // Display help on all commands
      var cmds = Object.keys(commands), long = 0, cmd;

      for(var i = 0; i < cmds.length; i++)
        if(commands[cmds[i]].visible !== false)
          long = Math.max(cmds[i].length, long);

      for(i = 0; i < cmds.length; i++) {
        cmd = commands[cmds[i]];
        if(cmd.visible !== false)
          display('${cyan:' + cmds[i] + '}' + ' '.repeat(long - cmds[i].length) + ' ' + cmd.legend);
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
      },
      {
        short   : 'f',
        long    : 'allow-formatting',
        legend  : tr('Allows formatting to be displayed')
      }
    ],
    callback : function(file, json, format) {
      var content = server[json ? 'readJSON' : 'readFile'](file);

      if(typeof content !== 'string')
        display_error('Failed to read file' + (json ? ' as json' : ''));
      else
        display(format ? content : fescape(content));
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
        legend  : tr('Folder\'s path. If omitted, read the current directory')
      },
      {
        short   : 'd',
        long    : 'details',
        legend  : tr('Display details for each file and folder')
      },
      {
        short   : 'h',
        long    : 'hidden',
        legend  : tr('Show hidden files and folders')
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

  tree: {
    legend   : tr('Display a file tree'),
    arguments: [
      {
        _       : 'path',
        legend  : tr('Folder\'s path. If omitted, read the current directory')
      },
      {
        short   : 'c',
        long    : 'color'
      }
    ],
    callback : function(path) {
      var tree  = server.tree(path, true);

      if(!tree)
        return display_error(tr('Directory not found'));

      display(tree);
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

  save: {
    legend   : tr('Manage your saves\' backups'),
    arguments: [],
    async    : true,
    callback : function(resolve) {
      ignoreKeys = false;

      choice([
        tr('Backup the current save'),
        tr('Restore a save backup'),
        tr('Estimate the save\'s size'),
        tr('(!) Restart the game'),
        tr('${cyan:' + tr('Cancel') + '}')
      ], function(ans) {
        if(ans === 5)
          return resolve();

        display('');

        switch(ans) {
          case 1:
            // Backup the current save
            question('Choose the backup\'s name (letters, digits, ${green:_ -} allowed)', function(name) {
              if(!name.match(/^[a-zA-Z0-9_\-]+$/))
                resolve('${red:' + tr('Wrong backup\'s name') + '}');
              else {
                var err = backupSave();

                if(err)
                  resolve('${red:' + err + '}');
                else
                  resolve('Backuped successfully');
              }
            });
            break;

          case 2:
            // BIG ERROR : 1st choice is displayed only after a fatal JS error
            // BIG ERROR : command non trouvée : b;;1]
            // BIG ERROR : [USER]: Cannot read property 'save' of undefined

            // Restore a backup
            display(tr('Backups list') + ' :');
            var keys           = Object.keys(localStorage), sav, date;
            var _sm_saves      = [];
            var _sm_saves_json = [];

            for(var i = 0; i < keys.length; i += 1) {
              if(keys[i].substr(0, backup_prefix.length) === backup_prefix) {
                try {
                  sav  = JSON.parse(localStorage.getItem(keys[i]));
                  date = formatDate(sav.date);
                  _sm_saves.push('${green:' + fescape(date) + ' '.repeat(16 - date.length) + '} ' + fescape(sav.marker) + ' '.repeat(30 - sav.marker) + '${cyan:' + fescape(keys[i].substr(backup_prefix.length)) + '}');
                  _sm_saves_json.push(sav);
                }

                catch(e) {
                  _sm_saves.push('${red:????????? ' + keys[i].substr(backup_prefix.length) + ' &#91;' + tr('Corrupted') + '&#93;}');
                  _sm_saves_json.push(false);
                }
              }
            }

            choice(_sm_saves.concat('${cyan:' + tr('Cancel') + '}'), function(ans) {
              if(ans === (_sm_saves.length) + 1)
                return resolve();

              var save = _sm_saves_json[vars.choice - 1];

              if(!save)
                return resolve('${red:' + tr('Unable to restore a corrupted backup') + '}');

              localStorage.setItem('haskier', save.save);

              window.location.reload();
            });

            break;

          case 3:
            display(tr('Backups list') + ' :');
            var keys = Object.keys(localStorage), list = [], corrupted = [], dates = [], sizes = [], listMax = 1, sizeMax = 1, length, sav;

            for(var i = 0; i < keys.length; i += 1) {
              if(keys[i].match(/^haskier_smb_([a-zA-Z0-9_\-]+)$/)) {
                list.push(keys[i].substr(backup_prefix.length));
                sizes.push(localStorage.getItem(keys[i]).length);

                try {
                  sav = JSON.parse(localStorage.getItem(keys[i]));
                  sav.date = formatDate(sav.date);
                  dates.push(' '.repeat(16 - sav.date.length) + sav.date);
                }

                catch(e) {
                  corrupted[i] = true;
                  dates.push('{f_$red:??????????}');
                }

                listMax = Math.max(listMax, list[list.length - 1].length);
                sizeMax = Math.max(sizeMax, sizes[sizes.length - 1].toString().length);
              }
            }

            for(i = 0; i < list.length; i += 1)
              display(list[i] + ' '.repeat(listMax - list[i].length) + ' '.repeat(sizeMax - sizes[i].length) + ' {f_cyan:' + sizes[i] + '} {f_$green:' + dates[i] + '} ' + (corrupted[i] ? ' {f_$red:[Corrompu]}' : ''));

            if(!list.length)
              display(tr('No backup was found'));

            resolve();
            break;

          case 4:
            display(tr("Do you REALLY want to restart the game ? All progression will be lost !\n${bold:NOTE :} Your save's backups won't be lost and you'll be able to restore it at any moment\nType your player's name : ${bold:${name}} to restart the game"));

            question(null, function(name) {
              if(name !== vars.name)
                return resolve();

              localStorage.removeItem('haskier');
              window.location.reload();
            });

            break;

        }
      });
    }
  },

  restart: {
    legend   : tr('Restart computer'),
    arguments: [],
    async    : true, // Game will stop until page is refreshed
    callback : function() {
      window.location.reload();
    }
  },

  /* Filters */

  with: {
    legend   : tr('Display only lines with contains a text'),
    inputflux: true,
    arguments: [
      {
        _       : 'text',
        legend  : tr('Text to search'),
        required: true
      },
      {
        short   : 'r',
        long    : 'regex',
        legend  : tr('Consider text as a regex')
      }
    ],
    callback : function(text, regex, cmd) {
      if(typeof cmd.$add !== 'string')
        return display_error(tr('`with` filter requires an input'));

      var subj = cmd.$add.split('\n'), out = [], regex, result;

      if(regex) {
        regex = makeRegex(text);

        if(typeof regex === 'string')
          return display_error(tr('Bad regex was specified') + ' : ' + regex);
      } else
        regex = new RegExp(rescape(fescape(text)), 'g');

      //console.log([subj, regex]);

      for(var i = 0; i < subj.length; i++) {
        //out.push(subj[i].replace(pattern, '${b_orange:$1}'));
        subj[i] = fescape(subj[i]);
        result  = subj[i].replace(regex, function(match) { return '${b_orange,f_black:' + match + '}'; });

        if(subj[i] !== result)
          out.push(result);
      }

      //display(fescape(out.join('\n')));
      display(out.join('\n'));
    }
  },

  cpm: {
    legend   : tr('Century Code Package Manager'),
    arguments: [
      {
        _       : 'action',
        legend  : 'install remove update restart',
        required: true
        //regex   : /^install$/ // Causing a fatal error
      },
      {
        _       : 'name',
        legend  : tr('Application\'s name'),
        required: true
      }
    ],
    async   : true,
    callback: function(action, name, resolve) {
      ignoreKeys = false;

      if(!action.match(/^install|remove|update|restart$/))
        return resolve('${red:' + tr('Bad action specified') + '}');

      if(!name.match(/^[a-zA-Z0-9_\-]+$/))
        return resolve('${red:' + tr('Bad application\'s name specified') +'}');

      var has = server.dirExists('/apps/' + name), err;

      switch(action) {
        case 'remove':
          if(!has) return resolve('${red:' + tr('Application "${name}" is not installed', [name]) + '}');
          confirm(tr('Do you really want to uninstall "${name}" ?', [name]), function(ans) {
            if(!ans)
              return resolve();

            if(err = server.removeTree('/apps/' + name))
              resolve('${red: ' + tr('Failed to remove "${name}". Please try again. Error : ${err}', [name, tr(err)]) + '}');
            else {
              saveGame();
              confirm(tr('"${name}" has been successfully removed. You must reboot your server to make changes takes effect. Reboot now ?', [name]), function(reboot) {
                if(reboot)
                  exec('restart');
                else
                  resolve();
              });
            }
          });
          break;

        case 'install':
        case 'update' :
          if(action === 'update' && !has) return resolve('${red:' + tr('Application "${name}" is not installed', [name]) + '}');
          if(action === 'install' && has) return resolve('${red:' + tr('Application "${name}" is already installed', [name]) + '}')

          var content = '', eq, barSize = 50;
          term.set_prompt('[' + ' '.repeat(barSize) + '] 0%');

          ignoreKeys = true;
          server.download({
            url     : 'app.xms',
            data    : {name: name},
            IP      : '__store',
            progress: function(progress, m, M, speed, time) {
              term.set_prompt('[' + '='.repeat(eq = Math.floor(progress * barSize)) + ' '.repeat(barSize - eq) + '] ' + Math.floor(progress * 100) + '% ' + time + ' (' + speed + ' b/s)');
            },
            error   : function(err, pkt) {
              if(!pkt) resolve('${red:' + err.split('\n').join('}\n${red:') + '}');

              if(pkt.headers.code === 404)
                resolve('${red:' + tr('Application "${name}" was not found on the store', [name]) + '}');
              else
                resolve('${red:' + tr('Failed to download "${name}"', [name]) + '}')
            },
            success: function(ct) {
              term.set_prompt('');

              display(tr('Creating folder...'));
              server.mkdir('/apps/' + name);

              display(tr('Extracting package...'));

              var app   = JSON.parse(ct);
              var files = Object.keys(app);

              for(var i = 0; i < files.length; i++) {
                display(tr('Extracting file ${i} of ${num}', [i + 1, files.length]));
                server.writeFile('/apps/' + name + '/' + files[i], app[files[i]]);
              }

              display(tr('Starting application...'));
              startApp(name);
              display(tr('Done.'));
              resolve();
            }
          });

          break;

        case 'restart':
          if(!has) return resolve('${red:' + tr('Application "${name}" is not installed', [name]) + '}');
          display(tr('Restarting application...'));
          startApp(names);
          display(tr('Done.'));
          break;
      }
    }
  },

  /* Secret command */
  hacker: {
    legend   : '?????????????',
    arguments: [],
    callback : function(args) {
      if(args._[0] === atob('SSdtIGEgaGFja2Vy')) {
        if(save.data.hacker)
          return display('You\'re already a hacker !');

        save.data.hacker = (new Date().getTime());
        display('${b_red,f_cyan,italic:You\'re a hacker now !}');
      } else if(!save.data.hacker)
        return display('${b_red,f_white,italic:' + tr('You can\'t access this mysterious command.') + '}');
    }
  }
};
