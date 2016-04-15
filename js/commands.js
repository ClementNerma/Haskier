'use strict';

/**
  * Some helpful regex
  * @type {object}
  */
var RegexCollection = {
  IP             : '(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)',
  port           : '[1-9][0-9]{0,3}',
  Boolean        : 'true|false',
  AlphaNumeric   : '[a-zA-Z0-9_]',
  AlphaNumeric_  : '[a-zA-Z0-9_]+',
  Integer        : '(\-|)([0-9]*)',
  PositiveInteger: '[1-9]([0-9]*)',
  Number         : '([0-9\.]+)',
  Email          : '([a-zA-Z0-9\\-]+)\.([a-zA-Z0-9\\-]+)@([a-zA-Z0-9\\-]+)\.([a-zA-Z0-9\\-]+)',
  TimeName       : '(second|minute|hour|month)(s|)'
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

        display('Description\n===========\n\n\t' + commands[command].legend + '\n\nSynopsis\n=========\n\n\t' + command + syn + '\n\n' + (desc ? 'Parameters\n==========' + desc : '${italic:' + tr('This command does not accept any parameter') + '.}') + (!commands[command].examples ? '' : '\n\nExamples\n========\n\n    ' + commands[command].examples.join('\n    ') + '\n'));
        return ;
      }

      // Display help on all commands
      var cmds = Object.keys(commands).sort(), long = 0, cmd;

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
      if(!needsWrite(file, TOKEN))
        return ;

      if(!server.writeFile(file, content))
        display_error(tr('Failed to write file'));
    }
  },

  edit: {
    legend   : tr('Edit a file'),
    async    : true,
    arguments: [
      {
        _       : 'action',
        legend  : tr('What you want to do ("insert" or "update")'),
        required: true,
        regex   : "insert|update"
      },
      {
        _       : 'file',
        legend  : tr('Filename'),
        required: true
      },
      {
        short   : 'l',
        long    : 'line',
        legend  : tr('Line to write'),
        regex   : RegexCollection.Integer
      },
      {
        short   : 'n',
        long    : 'length',
        legend  : tr('Number of lines to write'),
        regex   : RegexCollection.PositiveInteger
      }
    ],
    examples : [
      '${cyan:edit} ${green:insert file.txt -l 2 -n 5}'
    ],
    callback : function(act, file, line, length, resolve) {
      if(!needsWrite(file, TOKEN))
        return ;

      var i = -1, content = (server.fileExists(file) ? server.readFile(file).split('\n') : []);
      line = line || 0; length = length || 1;

      function ask() {
        i += 1;

        if(i === length) {
          if(!server.writeFile(file, content.join('\n')))
            resolve('${red:' + tr('Failed to write file') + '}');
          else
            resolve();

          return ;
        }

        question((line + i) + ':', function(ans) {
          content.splice(line + i, (act === 'update' ? 1 : 0), ans);
          ask();
        })
      }

      ask();
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
      if(!needsRead(file))
        return ;

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

      if(!needsWrite(path))
        return ;

      if(!server.exists(path))
        return display_error(tr('File or folder not found'));

      if(server.dirExists(path) && !folder)
        return display_error(tr('This is a folder. To remove it, use -f option.'));

      if(server.fileExists(path) && folder)
        return display_error(tr('This is a file. To remove it, remove the -f option.'));

      if(server.dirExists(path)) {
        if(server.ls(path).length && !recurse)
          return display_error(tr('Folder is not empty. To remove it, use -r option.'));

        res = server[recurse ? 'removeTree' : 'removeDir'](path);

        if(res)
          display_error(tr(res));
      } else {
        res = server.removeFile(path);

        if(!res)
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
        if(!needsRead(path))
          return ;

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
      if(!needsRead(path))
        return ;

      var list = server.ls(path, !!hidden);

      if(!list)
        return tr('Directory not found');

      if(!details) {
        display(fescape(list.join('\n')));
        return ;
      }

      var maxLength = 0;

      for(var i = 0; i < list.length; i += 1)
        if(list[i].length > maxLength)
          maxLength = list[i].length;

      for(i = 0; i < list.length; i += 1)
        display('${f_#90EE90:' + fescape(list[i]) + '}' + ' '.repeat(maxLength - list[i].length) + ' ${f_#7FFFD4:' + (server.fileExists((path || '') + '/' + list[i]) ? 'file' : 'directory') + '}');
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
      if(!needsRead(path))
        return ;

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
      if(!needsWrite(path))
        return ;

      if(!server.mkdir(path))
        display_error(tr('Failed to make folder'));
    }
  },

  com: {
    legend   : tr('Manage the communication services'),
    arguments: [
      {
        _       : 'state',
        legend  : tr('${cyan:open} Open the port, ${cyan:close} Close the port'),
        regex   : 'open|close',
        required: true
      }
    ],
    callback : function(state) {
      if(!needsCatch('com-port'))
        return ;

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
        regex   : 'enable|disable',
        required: true
      }
    ],
    callback : function(state) {
      if(!needsCatch('firewall'))
        return ;

      server.state('firewall-opened', state === 'enable');
      display(tr('Firewall') + ' ${cyan:' + (state === 'enable' ? tr('enabled') : tr('disabled')) + '}');
    }
  },

  save: {
    legend   : tr('Manage your saves\' backups'),
    arguments: [],
    async    : true,
    callback : function(resolve) {
      choice([
        tr('Backup the current save'),
        tr('Restore a save backup'),
        tr('(!) Restart the game'),
        tr(save.data.noAutoBackup ? 'Enable' : 'Disable') + ' ' + tr('auto-save backup'),
        tr('Export your backups'),
        tr('Import your backups'),
        tr('${cyan:' + tr('Cancel') + '}')
      ], function(ans) {
        if(ans === 7)
          return resolve();

        display('');

        switch(ans) {
          case 1:
            // Backup the current save

            question(tr('Choose the backup\'s name (letters, digits, ${green:_ -} allowed)'), function(name) {
              if(!name.match(/^[a-zA-Z0-9_\-]+$/))
                resolve('${red:' + tr('Wrong backup\'s name') + '}');
              else {
                var err = backupSave(null, name);

                if(err)
                  resolve('${red:' + err + '}');
                else
                  resolve(tr('Backuped successfully'));
              }
            });
            break;

          case 2:
            // Restore a backup

            display(tr('Backups list') + ' :');
            var keys           = Object.keys(localStorage), sav, date, name, corrupted, size;
            var _sm_saves      = [];
            var _sm_saves_json = [];

            for(var i = 0; i < keys.length; i += 1) {
              if(keys[i].substr(0, backup_prefix.length) === backup_prefix) {
                try { sav  = JSON.parse(reverse(LZString.decompressFromUTF16(localStorage.getItem(keys[i])))); corrupted = false; }

                catch(e) {
                  _sm_saves.push('${red:????????? ' + keys[i].substr(backup_prefix.length) + ' &#91;' + tr('Corrupted') + '&#93;}');
                  _sm_saves_json.push(false);
                  corrupted = true;
                }

                if(!corrupted) {
                  date = formatDate(sav.time);
                  name = fescape(keys[i].substr(backup_prefix.length));

                  if(!Number.isNaN(parseInt(name)))
                    name = '${orange:' + tr('Auto backup ${n}', [name]) + '}';
                  else
                    name = '${cyan:' + name + '}';

                  size = localStorage.getItem(keys[i]).length;
                  sav.marker = sav.marker || '-';
                  _sm_saves.push('${green:' + fescape(date) + ' '.repeat(16 - date.length) + '} ' + fescape(sav.marker) + ' '.repeat(30 - sav.marker) + ' ${bold:' + size + '}' + ' '.repeat(7 - size.toString().length) + name);
                  _sm_saves_json.push(sav);
                }
              }
            }

            choice(_sm_saves.concat('${cyan:' + tr('Cancel') + '}'), function(ans) {
              if(ans === (_sm_saves.length) + 1)
                return resolve();

              var save = _sm_saves_json[ans - 1];

              if(!save)
                return resolve('${red:' + tr('Unable to restore a corrupted backup') + '}');

              localStorage.setItem('haskier', LZString.compressToUTF16(reverse(JSON.stringify(save))));

              window.location.reload();
            });

            break;

          case 3:
            // Restart the game

            display(tr("Do you REALLY want to restart the game ? All progression will be lost !\n${bold:NOTE :} Your save's backups won't be lost and you'll be able to restore it at any moment\nType your player's name : ${bold:${name}} to restart the game"));

            question(null, function(name) {
              if(name !== vars.name)
                return resolve();

              localStorage.removeItem('haskier');
              window.location.reload();
            });

            break;

          case 4:
            // Toggle auto save backup
            save.data.noAutoBackup = !save.data.noAutoBackup;
            display(tr('Done.'));
            resolve();
            break;

          case 5:
            // Export all backups
            var names = Object.keys(localStorage), exp = {};

            for(var i = 0; i < names.length; i++) {
              if(names[i].substr(0, backup_prefix.length) === backup_prefix || names[i] === 'haskier')
                exp[names[i]] = LZString.decompressFromUTF16(localStorage.getItem(names[i]));
            }

            //blob_dw(LZString.compressToUTF16(JSON.stringify(exp)), 'haskier.bak');
              blob_dw(JSON.stringify(exp), 'haskier.bak');
              blob_dw(JSON.stringify(exp, null, 4), 'haskier-expanded.bak');
            resolve();
            break;

          case 6:
            // Import all backups
            //ignoreKeys = true;

            var callback = function() {
              $('#smfileimport').click();
              term.off('click', callback);
            };

            $('body').append($('<input type="file" id="smfileimport" />').hide().on('change', function(evt) {

              //Retrieve the first (and only!) File from the FileList object

              var f = evt.target.files[0];

              if (f) {
                var r = new FileReader();

                r.onload = function(e) {
          	      var contents = e.target.result;

                  try      { contents = JSON.parse(LZString.decompressFromUTF16(contents)); }
                  catch(e) { return resolve('${red:' + tr('Specified file is not a valid backup container') + '}'); }

                  display(tr('Do you want to clear the current storage ? This will erase all of your backups. Choose this option if the previous import failed.')),
                  question(tr('Clear storage ?'), function(erase) {
                    if(erase) {
                      localStorage.clear();
                      display(tr('Storage has been cleared.'));
                    }

                    var names = Object.keys(contents);

                    for(var i = 0; i < names.length; i++) {
                      try      { localStorage.setItem(names[i], LZString.compressToUTF16(contents[names[i]])); }
                      catch(e) { return display(tr('${red:' + tr('Some backups have been restored, but importation n°${num} has failed.', [i + 1]) + ' (' + names[i] + ')}')); }
                    }

                    display(tr('${num} backups have been imported successfully.', [names.length]));
                    resolve();
                  })
                };

                r.readAsText(f);
              } else {
                resolve('${red:' + tr('Failed to read file') + '}');
              }

            }));

            display(tr('Click into the window to select a file to import'));
            term.set_prompt(tr('Waiting for import...'));
            term.on('click', callback);
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

  cpm: {
    legend   : tr('Century Code Package Manager'),
    arguments: [
      {
        _       : 'action',
        legend  : 'install list remove update restart',
        required: true
      },
      {
        _       : 'name',
        legend  : tr('Application\'s name')
      }
    ],
    async   : true,
    callback: function(action, name, resolve) {
      // Check if action name is valid
      if(!action.match(/^install|list|remove|update|restart$/))
        return resolve('${red:' + tr('Bad action specified') + '}');

      // List all existing applications
      // NOTE : No permission is needed to list installed applications
      if(action === 'list')
        return resolve(server.glob('/apps/*', ['only_files', 'names_list', 'relative_path']).sort().join('\n'));

      if(!name || !name.match(/^[a-zA-Z0-9_\-]+$/))
        return resolve('${red:' + tr('Bad application\'s name specified') +'}');

      /*if(!needsRead('/apps/' + name))
        return resolve();*/

      var has = server.fileExists('/apps/' + name), err;

      switch(action) {
        case 'remove':
          // If app is a directory
          if(server.dirExists('/apps/' + name)) {
            // Then it's a system app
            return resolve('${red:' + tr('Application "${name}" is a system application and cannot be uninstalled', [name]) + '}');
          }

          if(!has) return resolve('${red:' + tr('Application "${name}" is not installed', [name]) + '}');

          confirm(tr('Do you really want to uninstall "${name}" ?', [name]), function(ans) {
            if(!ans)
              return resolve();

            if(!needsWrite('/apps/' + name))
              return resolve();

            if(!server.removeFile('/apps/' + name))
              resolve('${red: ' + tr('Failed to remove "${name}". Please try again.', [name]) + '}');
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

          if(!needsWrite('/apps/' + name))
            return resolve();

          /*if(!tokenWrite('/users/' + userName + '/.tmp/cpm.dwp')) // DWP = Downloading app
            return resolve('${red:' + tr('You are not allowed to wwrite temporary folder but CPM requires an access to store temporary download') + '}');*/

          var content = '', eq, barSize = 50;
          term.set_prompt('[' + ' '.repeat(barSize) + '] 0%');

          //ignoreKeys = true;

          server.download({
            url     : 'app.xms',
            data    : {name: name},
            IP      : ipalias.store,
            progress: function(progress, m, M, speed, time) {
              term.set_prompt('[' + '='.repeat(eq = Math.floor(progress * barSize)) + ' '.repeat(barSize - eq) + '] ' + Math.floor(progress * 100) + '% ' + time + ' (' + speed + ' b/s)');
            },
            error   : function(err, pkt) {
              if(!pkt) resolve('${red:' + err.split('\n').join('}\n${red:') + '}');

              if(pkt && pkt.headers.code === 404)
                resolve('${red:' + tr('Application "${name}" was not found on the store', [name]) + '}');
              else
                resolve('${red:' + tr('Failed to download "${name}" : Server error', [name]) + '}')
            },
            success: function(ct) {
              term.set_prompt('');

              /*display(tr('Creating folder...'));
              server.mkdir('/apps/' + name);

              display(tr('Extracting package...'));

              var app   = JSON.parse(ct);
              var files = Object.keys(app);

              for(var i = 0; i < files.length; i++) {
                display(tr('Extracting file ${i} of ${num}', [i + 1, files.length]));
                server.writeFile('/apps/' + name + '/' + files[i], app[files[i]]);
              }*/

              server.touchFile('/apps/' + name);

              display(tr('Starting application...'));

              if(!startApp(name))
                display_error(tr('Failed to start application.'));
              else
                display(tr('Done.'));

              resolve();
            }
          });

          break;

        case 'restart':
          if(!has) return resolve('${red:' + tr('Application "${name}" is not installed', [name]) + '}');
          display(tr('Restarting application...'));

          if(!startApp(name))
            display_error(tr('Failed to restart application.'));
          else
            display(tr('Done.'));

          display(tr('Done.'));
          break;
      }
    }
  },

  shell: {
    legend   : tr('Run a script or a command'),
    arguments: [
      {
        _       : 'path',
        legend  : tr('Script\'s path or command\'s content (require ${grey:--eveal})'),
        required: true
      },
      {
        short   : 'e',
        long    : 'eval',
        legend  : tr('Evaluate the content as a command')
      }
    ],
    callback : function(path, e) {
      if(!e) {
        path = server.readFile(path);

        if(typeof path !== 'string')
          return display_error('Failed to read file');
      }

      command_now(path);
    }
  },

  sleep: {
    legend   : tr('Sleep the script during a while'),
    async    : true,
    arguments: [
      {
        _       : 'time',
        legend  : tr('Sleep duration, in ms. If omitted, will sleep during 1000 ms.')
      }
    ],
    callback : function(time, resolve) {
      setTimeout(resolve, parseInt(time) || 1000);
    }
  },

  /* Generic SSH commands */

  "ssh-back": {
    legend   : tr('Return to the previous SSH server'),
    arguments: [],
    callback : function() {
      if(serverLogged.length <= 1) {
        display(tr('You\'re not connected to any SSH server anymore. You will be redirected to your home server.'));
        command_now('ssh-home');
      } else {
        back_ssh();
        display(tr('Welcome back to ${IP}', [serverName]));
      }
    }
  },

  "ssh-home": {
    legend   : tr('Return to your home SSH server'),
    arguments: [],
    callback : function() {
      home_ssh();
      display(tr('Welcome back to home, ${name} !'));
    }
  },

  /* TODO: Make 'cp' and 'mv' commands + 'rename' alias */

  cp: {
    legend   : tr('Copy a file'),
    arguments: [
      {
        _       : 'src',
        legend  : tr('Source file'),
        required: true
      },
      {
        _       : 'dest',
        legend  : tr('Destination file'),
        required: true
      }
    ],
    callback : function(src, dest) {
      if(!needsRead(src) || !needsWrite(dest))
        return ;

        var ret = server.copyFile(src, dest);

        if(ret)
          display_error(tr('Copy has failed : ${msg}', [tr(ret)]));
    }
  },

  mv: {
    legend   : tr('Move a file'),
    arguments: [
      {
        _       : 'src',
        legend  : tr('Source file'),
        required: true
      },
      {
        _       : 'dest',
        legend  : tr('New filename'),
        required: true
      }
    ],
    callback : function(src, dest) {
      if(!needsRead(src) || !needsRead(src) || !needsWrite(dest))
        return ;

      var ret = server.moveFile(src, dest);

      if(ret)
        display_error(tr('Move has failed : ${msg}', [tr(ret)]));
    }
  },

  every: {
    legend   : tr('Schedule script\'s execution'),
    arguments: [
      {
        _       : 'unit',
        legend  : tr('Time unit') + ' (day, minute, hour...)',
        required: true,
        regex   : RegexCollection.TimePart
      },
      {
        _       : 'path',
        legend  : tr('File path'),
        required: true
      }
    ],
    callback : function(unit, path) {
      // Here the path is normalized to make the scheduler work even though the current
      // Working directory changes
      path = server.normalize(path, true);

      every(unit, function() {
        command(server.readFile(path));
      });
    }
  },

  history: {
    legend   : tr('Get commands history'),
    arguments: [
      {
        _       : 'last',
        legend  : tr('Number of entries to display. If omitted, will display all entries.'),
        regex   : RegexCollection.PositiveInteger
      },
      {
        long    : 'clear',
        legend  : tr('Clear the history. Permit to make free space on the save.')
      },
      {
        long    : 'size',
        legend  : tr('Change maximum size of the history. Default: ${default}', [300]),
        regex   : RegexCollection.PositiveInteger
      }
    ],
    callback : function(last, clear, size) {
      if(last)
        display(fescape(haskierHistory.reverse().slice(0, last).join('\n')));
      else
        display(fescape(haskierHistory.join('\n')));

      if(size)
        save.data.max_history_size = size;

      if(clear)
        haskierHistory = [];
    }
  },

  /* Filters */

  with: {
    legend   : tr('Display only lines wich contains a text'),
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
