'use strict';

$('#wl').text('game core');

var hidden = $('#terminal, #clock').hide(),
  dontRecoverPrompt = false, hsf_conds = [], todo = [], justRestored = false, justRestoredLabel = false,
  ignoreKeys = false, gameStarted = false, clock, clockInterval, clockMove, cmd_out = [], buff_out = [],
  redirection = false, query = (function(query) {var result = {};query.split('&').forEach(function(part) {var item = part.split("=");result[item[0]] = decodeURIComponent(item[1]);});return result;})(location.search.substr(1)),
  fastMode = !!query.fastmode, fastdev = (query.fastmode === atob('ZGV2ZWxvcHBlci1oYXg=')), CompiledRegExp = {}, whenLogged = [],
  onShellReady, modules = {}, haskierHistory = [], historyRecall, onQueueFinished, clipboard = '', prompt_prefix, groups = [],
  commandsData = {}, last_cmd = '', masterCommand, ssh_events = {log: [], back: []};
/* FastDev query parameters :
 * label         Go to a HSF label when scope.restore() is called
 * exec          Run a shell command when scope.todo() is called
 * reset         Reset the game's save
 * fast-human    Hyper-fast human dialogs
 * fast-clock    No waiting for wait_at HSF event
 * fast-network  Set Hypernet connection speed. (fast-network=...) Set to 16384 b/s if no value is specified (= 16 kb/s)
 * clear-console Clear the developper's console when the game has been entirely loaded
 * javascript    Run a JavaScript command when scope.todo() is called
 * everplay      Never have a 'Game Won' When game is finished, screen is paused
 */

if(query.reset)
  localStorage.removeItem('haskier');

/*const*/
var   readingLineDuration = 35;
var   humanSpeed          = 70;
const backup_prefix       = 'hsk_arch_';

/* Global constants */
const DONT_PREVENT_KEYDOWN     = 101;
const RESTORE_KEYDOWN_CALLBACK = 102;
const RESTORE_COMMAND_CALLBACK = 103;

const OUTSIDE_EXPLOITS         = ['ac7-certificate-unverif'];
const INSIDE_EXPLOITS          = ['net-x07'];

// Make anonymous server (model)
var model = new Server();
var clone = model.clone;

/**
  * Start the game !
  */
function ready() {
  var started = Date.now();

  hidden.show();

  game.event('label', function(name, marker, step) {
    if(game.getVar('FREEZE_UNTIL_TODO'))
      game.setVar('dont_update_prompt', true);

    if(!justRestoredLabel) {
      saveGame();

      if(step.data === 'checkpoint' && !save.data.noAutoBackup) {
        var err = backupSave();
        if(err) console.error(err);
      }
    } else
      justRestoredLabel = false;
  });

  game.event('display', function(text, i, code) {
    if(game.getVar('human_talking'))
      scope.human((game.getVar('human_talking') === true ? '' : game.getVar('human_talking') + ' : ') + text);
    else {
      ignoreKeys = true;
      term.set_prompt('');
      display(game.getVar('ALLOW_TRANSLATION') ? tr(text) : text);
      setTimeout(function() {
        ignoreKeys = false;
        if(!game.getVar('dont_update_prompt'))
          updatePrompt();
        go();
      }, readingLineDuration * text.length);
    }
  });

  if(save.logged)
    serverLogged = save.logged;

  $('#wlp').text(': Configuring servers');

  var names = Object.keys(haskier.servers), name, apps, j, d, l, bootErr;

  for(var i = 0; i < names.length; i++) {
    name = names[i];
    //servers[name] = new Server();
    (new Server(name, JSON.parse(haskier.servers[names[i]]['.sys']['server.sys']).alias));

    if(save.servers && save.servers[name])
    // If the server is found into save
      servers[name].import(save.servers[name]);
    else {
      // Import data
      servers[name].import(haskier.servers[names[i]], 'files');
      servers[name].install();
    }

    servers[name].install();
  }

  // Deploy IT parks
  // NOTE: DeployPark() consider the save's data
  $('#wlp').text('Deploying IT parks...');
  console.info('Deploying IT park...');

  var groups = Object.keys(haskier.groups);

  for(var i = 0; i < groups.length; i++)
    DeployPark(haskier.groups[groups[i]]);

  if(!save.time && haskier['install.js']) {
    $('#wlp').text(': Running installation program');
    window.eval(haskier['install.js']);
  }

  $('#wlp').text('Starting servers...');
  display(tr('Starting up the servers...'));
  console.info('Starting up servers...');

  for(i = 0; i < names.length; i++) {
    display(tr('Starting up server ${num} of ${total}...', [i + 1, names.length]))

    d = Date.now();

    if(bootErr = bootServer(names[i], true))
      console.error(bootErr);

    if(server.fileExists('/user/init.hss') && names[i] !== (save.logged && save.logged.length ? save.logged[save.logged.length - 1] : ipalias.local))
      command(server.readFile('/user/init.hss'));

    console.log('Starting up server ' + (i + 1) + '/' + names.length + ' (' + (Date.now() - d) + ' ms)');
  }

  console.info('All servers were started !');

  $('#wlp').text('Preparing networks...');
  display(tr('Preparing networks...'));
  console.info('Preparing networks...');

  names = Object.keys(haskier.networks);

  for(var i = 0, j, name, split; i < names.length; i++) {
    name           = names[i].substr(0, names[i].lastIndexOf('.'));
    domains[name]  = {};
    split          = haskier.networks[names[i]].split('\n');

    for(j = 0; j < split.length; j++) // For each line in the DNS file
      if(split[j].length) // If line is not empty
        domains[name][split[j].substr(0, split[j].indexOf(' '))] = formatVars(split[j].substr(split[j].lastIndexOf(' ') + 1));
  }

  $('#wlp').text(': Remaking SSH connections');
  console.info('Remaking SSH connections');

  for(var z = 0; z < serverLogged.length; z++)
    log_ssh(serverLogged[z][0], serverLogged[z][1], true);

  /* Clock setup */

  clockMove = function() {
    if(todo.length || !game.getVar('FREEZE_CLOCK_UNTIL_TODO'))
      clock.addMinutes(1);

    vars.clock = {
      year   : clock.getFullYear(),
      month  : clock.getMonth() + 1,
      day    : clock.getDate(),
      hours  : clock.getHours(),
      minutes: clock.getMinutes(),
      seconds: clock.getSeconds(),

      t_hour : clock.toString('t'),
      t_date : clock.toString('d')
    };

    $('#clock').text(vars.clock.t_date + ' ' + vars.clock.t_hour);
  };

  // Clock moves
  clock = save.clock ? new Date(save.clock) : new Date(0);
  $('#clock').hide();

  term.clear();

  if(save.logged && save.logged.length) {
    var logged = save.logged[save.logged.length - 1];
    updateServer(logged[0], logged[1]);
  } else
    updateServer(ipalias.local, 'Shaun');

  console.info('Resolving whenLogged[] callbacks...');

  for(i = 0; i < whenLogged.length; i++)
    whenLogged[i](serverUser);

  updateUI();

  if(haskier['service.js']) {
    $('#wlp').text(': Starting up service thread');
    console.info('Starting up service.js...');
    (new Function([], haskier['service.js'])).apply(window, []);
  }

  gameStarted = true;
  console.info('Game     started in ' + (Date.now() - started) + ' ms\nWeb page started in ' + (Date.now() - webPageStarted) + ' ms');

  if(fastdev && query['clear-console'])
    console.clear();

  if(server.fileExists('/user/init.hss'))
    onShellReady = server.readFile('/user/init.hss');

  $('#loading').hide(); // Don't remove it, maybe we'll use it again
  term.focus();
  go();
}

/**
  * Start an app on a server
  * @param {string} app
  * @param {string} [serverName]
  * @param {boolean} [returnError] If an error occures, return it instead of returning `false`
  * @return {boolean|Error}
  */
function startApp(app, serverName, returnError) {
  var _server = serverName ? servers[serverName] : server;
  var local   = _server.dirExists('/apps/' + app);

  try {
    (new Function(['server', 'register', 'load_translation', 'exec', 'getcmd', 'include', 'exports', 'whenLogged', '$TOKEN'], (local ? server : aliases.store).readFile((local ? '/apps/' : '/webroot/') + app + '/app.hps'))).apply(window, [_server, function(name, command) {
      if(typeof command.legend !== 'string' || !Array.isArray(command.arguments) || typeof command.callback !== 'function')
        fatal('Can\'t register invalid command "' + name + '"');

      if(!commandsData.hasOwnProperty(name))
        commandsData[name] = {};

      serversCommands[serverName || window.serverName][name] = command;
      serversCommands[serverName || window.serverName][name].data = commandsData[name];
    }, function(path) {
      if(!(/^([a-zA-Z0-9_\-\{\}\.\$\/]+)$/.test(path)))
        return false;

      var tr_file = (local ? server : aliases.store).readFile((local ? '/apps/' : '/webroot/') + app + '/' + path.replace(/\$\{lang\}/g, language));

      if(typeof tr_file !== 'string')
        return false;

      tr_file = JSON.parse(tr_file);
      var keys = Object.keys(tr_file);

      for(var i = 0; i < keys.length; i++)
        tr_pkg[keys[i]] = tr_file[keys[i]];

      return true;
    }, function(cmd, applyArgs) {
      // Important : Only synchronous operations are supported !
      return serversCommands[serverName || window.serverName][cmd].apply(serversCommands[serverName || window.serverName], applyArgs);
    }, function(name) {
      return serversCommands[serverName || window.serverName].hasOwnProperty(name) ? serversCommands[serverName || window.serverName][name] : false;
    }, function(file) {
      return (local ? server : aliases.store).readFile((local ? '/apps/' : '/webroot/') + app + '/' + file);
    }, function(name, value) {
      var sN = serverName || window.serverName;

      if(!modules.hasOwnProperty(sN))
        modules[sN] = {};

      if(!modules[sN].hasOwnProperty(app))
        modules[sN][app] = {};

      if(typeof name !== 'object') {
        // register one-value module
        modules[sN][app][name] = value;
      } else {
        var keys = Object.keys(name);

        for(var i = 0; i < keys.length; i++)
          modules[sN][app][keys[i]] = name[keys[i]];
      }
    }, function(callback) {
      if(!gameStarted)
        whenLogged.push(callback);
      else
        callback(serverUser);
    }, clone(TOKEN || TOKENS.system /* fix a bug. Is that causing an issue ? */)]);

    return true;
  }

  catch(e) {
    console.error(e);
    report_bug('Failed to start application ' + app + ' from server ' + (serverName || window.serverName), e.stack);
    return returnError ? e : false;
  }
}

/**
  * Run the next game's instruction
  */
var go = function() {
  if(!queue.length && !runningCmd)
    game.step();
  else
    onQueueFinished = go;
};

/**
  * Save the game
  */
function saveGame() {
  if(!saveSupport)
    return console.warn('saveGame() was ignored because localStorage doesn\'t work');

  delete vars.scope  ;
  delete vars.ipalias;
  delete vars.aliasip;

  try {
    var lastSave = localStorage.getItem('haskier'), _servers = {}, _groups = {}, names = Object.keys(servers);

    // Export all servers
    for(var i = 0; i < names.length; i++)
      if(names[i] !== ipalias.store && names[i].substr(0, 2) !== '$_') {
        if(groups.indexOf(names[i]) === -1)
          // Normal server
          _servers[names[i]] = servers[names[i]].export();
        else
          // Member of a group
          _groups[aliasip[names[i]]] = {IP: names[i], server: servers[names[i]].export()};
      }

    localStorage.setItem('haskier', LZString.compressToUTF16(reverse(JSON.stringify({
      view    : term.export_view(),
      vars    : vars,
      time    : (new Date()).getTime(),
      data    : save.data,
      servers : _servers,
      groups  : _groups,
      logged  : serverLogged,
      clock   : clock.getTime(),
      server  : serverName,
      scope   : game.diffScope(),
      label   : game.label(),
      marker  : game.marker(),
      history : haskierHistory,
      notepad : $('#notepad').html(),
      dsas    : didSomethingAfterSave
    }))));
  }

  catch(e) {
    alert(tr('Failed to save game. Please try again. If that doesn\'t work, type `force-save` in the terminal and press Return.'));
    console.error('Failed to save game\n' + e.stack);
  }

  vars.scope   = scope  ;
  vars.ipalias = ipalias;
  vars.aliasip = aliasip;
}

/**
  * Backup the current save
  * @param {boolean} [allowDeletingOlder] Default: false
  * @param {string} name Archive name
  * @return {string|void} String = error message (translated)
  */
function backupSave(allowDeletingOlder, name) {
  // Backup the previous save
  var lastSave = localStorage.getItem('haskier');

  if(!lastSave)
    return false;

  try {
    var id;

    if(!name) {
      id = 1, name;
      while(localStorage.getItem(name = backup_prefix + id))
        id++;
    } else
      name = backup_prefix + name;

    if(localStorageFree() > lastSave.length + 16) {
      try { localStorage.setItem(name, lastSave); }
      catch(e) { console.error('Failed to backup last Haskier save\n' + e.stack); }
    } else {
      if(!allowDeletingOlder)
        return tr('There is not enough space to backup save without deleting older ones');

      // If there is not enough memory to backup the last save
      var keys = Object.keys(localStorage), backups = [], taken = 0;

      // This loop permit to sort the backups ID
      for(var i = 0; i < keys.length; i++) {
        if(keys[i].substr(0, backup_prefix.length) === backup_prefix) {
          backups.push(keys[i].substr(backup_prefix.length));
          taken += localStorage.getItem(keys[i]).length;
        }
      }

      if(taken > lastSave.length + 16) {
        backups = backups.sort();

        for(i = 0; i < backups.length; i++) {
          localStorage.removeItem(backup_prefix + i);

          if(localStorageFree() > lastSave.length + 16)
            break;
        }

        console.info(i + ' backups were deleted to make free space for backuping the last save (' + (lastSave.length / 1024).toFixed(1) + ' Kb)');
        try { localStorage.setItem(backup_prefix + (parseInt(backups[backups.length - 1]) + 1), lastSave); return ; }
        catch(e) { console.error('Failed to backup last Haskier save\n' + e.stack); return tr('Failed to backup save'); }
      } else {
        if(backups.length)
          return tr('There is no enough total space to backup save');
        else
          return tr('Even if deleting ${num} backups, there is not enough space to backup save', [backups.length]);
      }
    }
  }

  catch(e) {
    console.error('Failed to save game\n' + e.stack);
    report_bug('')
    return false;
  }
}

/**
  * Check if a TOKEN can catch an event
  * @param {string} event
  * @param {object} [token]
  * @return {boolean}
  */
function tokenCatch(event, token) {
  token = token || TOKEN;
  return (token.catch === '*' ? true : token.catch.indexOf(event) !== -1);
}

/**
  * Check if a TOKEN can write a path
  * @param {string} path
  * @param {object} [token]
  * @return {boolean}
  */
function tokenWrite(path, token) {
  var i;

  path  = server.normalize(path, true);
  token = token || TOKEN;

  if(token.include) {
    for(i = 0; i < token.include.length; i++)
      if(path.substr(0, token.include[i].length + 1) === token.include[i] + '/' || path === token.include[i])
        return true;

    return false;
  } else if(token.exclude) {
    for(i = 0; i < token.exclude.length; i++)
      if(path.substr(0, token.exclude[i].length + 1) === token.exclude[i] + '/' || path === token.exclude[i])
        return false;

    return true;
  } else
    return true;
}

/**
  * Check if a TOKEN can read a path
  * @param {string} path
  * @param {object} [token]
  * @return {boolean}
  */
function tokenRead(path, token) {
  token = token || TOKEN;

  var i;
  path = server.normalize(path, true);

  if(token.includeRead) {
    for(i = 0; i < token.includeRead.length; i++)
      if(path.substr(0, token.includeRead[i].length + 1) === token.includeRead[i] + '/' || path === token.includeRead[i])
        return true;

    return false;
  } else if(token.excludeRead) {
    for(i = 0; i < token.excludeRead.length; i++)
      if(path.substr(0, token.excludeRead[i].length + 1) === token.excludeRead[i] + '/' || path === token.excludeRead[i])
        return false;

    return true;
  } else
    return true;
}

/**
  * Display an error if TOKEN doesn't permit to catch an event
  * @param {string} event
  * @param {object} [token]
  * @return {boolean}
  */
function needsCatch(event, token) {
  if(!tokenCatch(event, token)) {
    display_error(tr('You are not allowed to access event "${event}"', [event]));
    return false;
  }

  return true;
}

/**
  * Display an error if TOKEN doesn't permit to write a path
  * @param {string} path
  * @param {object} [token]
  * @return {boolean}
  */
function needsWrite(path, token) {
  if(!tokenWrite(path, token)) {
    display_error(tr('You are not allowed to write "${path}"', [path || server.chdir()]));
    return false;
  }

  return true;
}

/**
  * Display an error if TOKEN doesn't permit to read a path
  * @param {string} path
  * @param {object} [token]
  * @return {boolean}
  */
function needsRead(path, token) {
  if(!tokenRead(path, token)) {
    display_error(tr('You are not allowed to read "${path}"', [path || server.chdir()]));
    return false;
  }

  return true;
}

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
  * Make a regex from a string
  * @param {string} str Like : /my (friend|boy)/igm
  * @return {RegExp|string}
  */
function makeRegex(str) {
  if(str.substr(0, 1) !== '/')
    return tr('Missing opening slash');

  var ls /* last slash */ = str.lastIndexOf('/');

  if(ls <= 0)
    return tr('Missing closing slash');

  var flags = str.substr(ls + 1), content = str.substr(1, ls - 1);

  try      { return new RegExp(content, flags); }
  catch(e) { return e.message; }
}

/**
  * Run a command
  * @param {string} cmd
  * @param {*} [add] Additionnal data
  * @param {boolean} [now] Run after the current command
  */
function command(cmd, add, now) {
  if(!cmd)
    return ;

  cmd = cmd.split(/&&|\n/);

  if(cmd.length === 1) {
    if(cmd[0].trim().substr(0, 1) !== '#')
      queue[now ? 'unshift' : 'push']([cmd[0], add]);
  } else {
    if(now)
      cmd = cmd.reverse();
    for(var i = 0; i < cmd.length; i++)
      if(cmd[i].trim().substr(0, 1) !== '#' && cmd[i].trim().length)
        queue[now ? 'unshift' : 'push']([cmd[i], add]);
  }

  if(!runningCmd)
    treatQueue();
}

/**
  * Run a command after the current
  * @param {string} cmd
  * @param {*} [add] Additionnal data
  */
function command_now(cmd, add) { return command(cmd, add, true); }

/**
  * Treat commands' queue
  */
function treatQueue() {
  if(!queue.length)
    return report_bug('treatQueue() has been called but queue is empty');

  if(runningCmd)
    return report_bug('treatQueue() has been called but a command is already running');

  ignoreKeys = true; //term.pause(); // $('#cover').show(); -> doesn't work better

  var entry  = queue.splice(0, 1)[0];
  var cmd    = entry[0], add = entry[1];

  ignoreKeys = true;

  exec(cmd, function(text) {
    ignoreKeys = false; //term.resume(); // $('#cover').hide(); -> doesn't work better

    if(gameStarted) {
      updatePrompt();

      didSomethingAfterSave = true;
      saveGame();
    }

    // If queue is not empty
    if(queue.length)
      // We've to treat it
      treatQueue();
    else if(todo.length && gameStarted) {
      last_cmd = cmd;

      // Here, we've wait queue is empty to check if todo is accomplished
      // And because condition contains 'todo.length' we know that todo list is not empty

      for(var i = 0; i < todo.length; i++) {
        if(todo[i][0] === 'command' && window.eval(todo[i][1])) {
          todo.splice(i, 1);
          i--;
        }
      }

      // If the todo array is empty, all todo tasks were done
      // So we can continue the HSF running
      if(!todo.length)
        go();
    }

    // If all commands have been runned and there is a
    // `onQueueFinished` callback
    if(!queue.length && onQueueFinished) {
      // ... run it !
      onQueueFinished();
      onQueueFinished = null;
    }
  }, add);
}

/**
  * Prepare arguments for a command
  * @param {object} args Parsed arguments
  * @param {object} expected Expected arguments
  * @return {object|string}
  */
function prepareArguments(args, expected) {
  var prepare = [], arg, _ = args._, j = -1, subject;

  for(var i = 0; i < expected.length; i++) {
    arg = expected[i];

    if(arg._) {
      // Inline argument (don't start by a dash)
      if(_.length <= ++j) {
        if(arg.required)
          return tr('Missing argument "${name}"', [arg._]);
        else
          // Because argument is not required, we put an empty argument instead
          prepare.push(undefined);
      } else
        prepare.push(_[j]);
    } else if(arg.short && arg.long) {
      // Can be a short OR a long argument

      if(!args[arg.short] && !args[arg.long] && arg.required)
        return tr('Missing argument -${short}|--${long}', [arg.short, arg.long]);

      prepare.push(args[arg.short] || args[arg.long]);
    } else if(arg.short) {
      // Can only be a short argument

      if(!args[arg.short] && arg.required)
        return tr('Missing argument -${short}', [arg.short]);

      prepare.push(args[arg.short]);
    } else if(arg.long) {
      // Can only be a long arugment

      if(!args[arg.long] && arg.required)
        return tr('Missing argument -${long}', [arg.long]);

      prepare.push(args[arg.long]);
    }

    subject = prepare[prepare.length - 1];
    var regex;

    if(arg.regex) {
      if(!CompiledRegExp[arg.regex])
        CompiledRegExp[arg.regex] = new RegExp('^' + arg.regex + '$');

      regex = CompiledRegExp[arg.regex];
    }

    // If the argument is defined and its value is bad
    if((arg.regex && typeof subject !== 'undefined' && !regex.test(asPlain(subject)))
    || (arg.check && typeof subject !== 'undefined' && !arg.check(subject))) {
      // Returns an error
      return arg.error || tr('Bad value was specified for argument ${arg}', [
        arg.short && arg.long ? '-' + arg.short + '|--' + arg.long :
          arg.short ? '-' + arg.short :
            arg.long ? '--' + arg.long :
              /* i */ '`' + arg._ + '`'
      ]);
    }
  }

  // Returns prepared command schema
  return prepare;
}

/**
  * Execute a command without queue
  * @param {string} cmd
  * @param {function} [callback]
  * @param {*} [add] Additionnal data
  */
function exec(cmd, callback, add) {
  var prepare, filter, filter_name, tmp, symbol, file, input, original = cmd;
  runningCmd = true;
  callback   = callback || function(){};

  cmd = format(cmd.trim());

  // If the '>' symbol is present within the command
  if((symbol = cmd.indexOf('>')) !== -1) {
    // Check it's not between quotes
    file   = cmd.substr(cmd.indexOf('>') + 1);
    tmp    = cmd.substr(0, symbol);
    tmp    = tmp.split('"').length / 2 - 0.5;

    // If there is the same number of double quotes before the redirection symbol...
    if(Math.floor(tmp) !== tmp)
      // Then that's not a file's name
      file = '';
    else {
      // We modify the typed command
      cmd  = cmd.substr(0, symbol - 1).trim();
      file = file.trim();
    }
  }

  // If the '>' symbol is present within the command
  if((symbol = cmd.indexOf('<')) !== -1) {
    // Check it's not between quotes
    input  = cmd.substr(cmd.indexOf('<') + 1);
    tmp    = cmd.substr(0, symbol);
    tmp    = tmp.split('"').length / 2 - 0.5;

    // If there is the same number of double quotes before the redirection symbol...
    if(Math.floor(tmp) !== tmp)
      // Then that's not a file's name
      input = '';
    else {
      // We modify the typed command
      cmd   = cmd.substr(0, symbol - 1).trim();

      // That's so bad but we have to delete the original 'add' content.
      // Normally that's not a problem because $add has a value only when using a filter...

      input = input.trim();

      if(input.substr(0, 1) === '$')
        add = vars[input.substr(1)] || '';
      else {
        add = server.readFile(input.trim());

        // If failed to read input file
        if(typeof add !== 'string') {
          runningCmd = false;
          display_error(tr('Failed to read ${input} as input file', [input]));
          callback();
          return ;
        }
      }
    }
  }

  // If the '|' symbol is present within the command
  if((symbol = cmd.indexOf('|')) !== -1) {
    // Check it's not between quotes
    filter = cmd.substr(cmd.indexOf('|') + 1);
    tmp    = cmd.substr(0, symbol - 1);
    tmp    = tmp.split('"').length / 2 - 0.5;

    // If there is the same number of double quotes before the filter symbol...
    if(Math.floor(tmp) !== tmp)
      // Then that's not a filter
      filter = '';
    else {
      // We modify the typed command
      cmd    = cmd.substr(0, symbol - 1).trim();
      filter = filter.trim(); filter_name = filter.split(' ')[0];

      if(!commands.hasOwnProperty(filter_name)) {
        runningCmd = false;
        display_error(tr('filter not found : ${filter}', [filter_name]));
        callback();
        return ;
      }

      if(!commands[filter_name].inputflux) {
        runningCmd = false;
        display_error(tr('${filter} is not a filter', [filter]));
        callback();
        return ;
      }
    }
  }

  callback = callback || function(){};
  cmd      = parseCommand(cmd);

  // If the command is not found
  if(!commands.hasOwnProperty(cmd.$)) {
    if(tokenRead('/env/' + cmd.$ + '.hss') && server.fileExists('/env/' + cmd.$ + '.hss')) {
      // If /env/${path}.hss exist
      command_now(server.readFile('/env/' + cmd.$ + '.hss'));
      runningCmd = false;
      callback.apply(this, arguments);
      return ;
    } else if(tokenRead(cmd.$ + '.hss') && server.fileExists(cmd.$ + '.hss')) {
      // If /${path}.hss exist
      command_now(server.readFile(cmd.$ + '.hss'));
      runningCmd = false;
      callback.apply(this, arguments);
      return ;
    } else {
      if(masterCommand)
        cmd = masterCommand(cmd) || cmd;

      // Else : the command was not found
      runningCmd = false;
      display_error(tr('command not found : ${cmd}', [fescape(cmd.$)]));
      callback();
      return ;
    }
  }

  var call = commands[cmd.$];

  // TODO : Display the exact problem
  if(typeof (prepare = prepareArguments(cmd, call.arguments)) === 'string') {
    runningCmd = false;
    display('${red:' + tr('bad syntax for command `${cmd}` : ${err}', [cmd.$, prepare]) + '}');
    callback();
    return ;
  }

  //prepare = prepare.concat(call.async ? [callback, cmd] : cmd);
  if(call.async) {
    // Remove prompt
    term.set_prompt('');
    // Add the resolver callback
    prepare.push(function(text) {
      if(typeof text !== 'undefined')
        display(text);

      runningCmd = false;

      if(filter) {
        if(file) {
          buff_out = clone(cmd_out);
          outputFilter = function(txt) { buff_out.push(txt); };
          exec(filter, function() {
            outputFilter = false;
            if(file.substr(0, 1) === '$')
              vars[file.substr(1)] = buff_out.join('\n');
            else {
              if(needsWrite(file) && file !== 'nul')
                server.writeFile(file, buff_out.join('\n'));
            }
            callback();
          }, cmd_out.join('\n'));
        } else {
          outputFilter = false;
          exec(filter, null, cmd_out.join('\n'));
          callback.apply(this, arguments);
        }
      } else if(file) {
        outputFilter = false;
        if(file.substr(0, 1) === '$')
          vars[file.substr(1)] = cmd_out.join('\n');
        else {
          if(needsWrite(file) && file !== 'nul')
            server.writeFile(file, cmd_out.join('\n'));
        }
        callback.apply(this, arguments);
      } else
        callback.apply(this, arguments);
    });
  }

  prepare.push(cmd);

  if(add)
    cmd.$add = add;

  if(filter || file) {
    cmd_out = [];
    outputFilter = function(txt) { cmd_out.push(txt); };
  }

  call.callback.apply(call, prepare);

  if(!call.async) {
    runningCmd = false;

    if(filter) {
      if(file) {
        buff_out = clone(cmd_out);
        outputFilter = function(txt) { buff_out.push(txt); };
        exec(filter, function() {
          outputFilter = false;
          if(file.substr(0, 1) === '$')
            vars[file.substr(1)] = buff_out.join('\n');
          else {
            if(needsWrite(file) && file !== 'nul')
              server.writeFile(file, buff_out.join('\n'));
          }
          callback.apply(this, arguments);
        }, cmd_out.join('\n'));
      } else {
        outputFilter = false;
        exec(filter, callback, cmd_out.join('\n'));
      }
    } else if(file) {
      outputFilter = false;
      if(file.substr(0, 1) === '$')
        vars[file.substr(1)] = cmd_out.join('\n');
      else {
        if(needsWrite(file) && file !== 'nul')
          server.writeFile(file, cmd_out.join('\n'));
      }
      callback.apply(this, arguments);
    } else
      callback.apply(this, arguments);
  }
}

/**
  * Separe command and arguments
  * @param {string} cmd
  * @return {object}
  */
function parseLine(cmd) {
  var args = [], readingPart = false, part = '', escaping = false, i, index = cmd.indexOf(' '),
      str  = (index === -1 ? '' : cmd.substr(index + 1)), base = (index === -1 ? cmd : cmd.substr(0, index));

  for(i = 0; i < str.length; i++) {
    if(escaping) {
      escaping = false;
      part    += str.charAt(i);
      continue ;
    }

    if(str.charAt(i) === ' ' && !readingPart) {
      args.push(part);
      part = '';
    } else {
      if(str.charAt(i) === '"')
        readingPart = !readingPart;
      else if(str.charAt(i) === '\\')
        escaping = true;
      else
        part += str.charAt(i);
    }
  }

  if(part.length)
    args.push(part);

  return {
    name: base,
    args: args,
    rest: str
  };
}

/**
  * Parse a command with arguments
  * @param {string} cmd
  * @return {object}
  */
function parseCommand(cmd) {
  //var parse = jQuery.terminal.parseCommand(cmd);
  var parse = parseLine(cmd);

  if(parse.args.length)
    parse.args = minimist(parse.args);

  var ret = !Array.isArray(parse.args) ? parse.args : {};
  ret.$   = parse.name;
  ret._   = parse.args._ || [];
  return ret;
}

/**
  * Simulate a shell injection
  * @param {string} cmd
  */
function simulateShellWrited(cmd) {
  term.find('> .terminal-output:first').append($('<div><div style="width:100%;"></div></div>').find('div').append(term.find('> .cmd:first > .prompt').clone().html() + '<span>' + escapeHtml(cmd) + '</span>').parent());
}

/**
  * Update the entire UI
  */
function updateUI() {
  $('.terminal, .cmd').css('font-family', (save.data.font ? save.data.font + ', ' : '') + 'Consolas, Courier, "Inconsolata"');
  updatePrompt();

  if(save.data.lineWaiting)
    readingLineDuration = save.data.lineWaiting;

  if(save.data.writingSpeed)
    humanSpeed = save.data.writingSpeed;

  if(fastMode) {
    readingLineDuration = 0;

    if(query['fast-human'])
      humanSpeed = 0;
  }
  //$('#infos')[save.data.showInfobar ? 'show' : 'hide']();
}

/**
  * Update the terminal's prompt
  */
function updatePrompt(prefix) {
  if(game && !game.getVar('dont_update_prompt')) {
    vars.cwd = server.chdir();

    var prompt = ((prefix || prompt_prefix || '') + (save.data.prompt || '${green:${user}}${cyan:@${server}}:${blue:${cwd}}$ ')).split('\n');

    if(prompt.length > 1)
      display(prompt.splice(0, prompt.length - 1).join('\n'));

    term.set_prompt(format(prompt[0]));
  }
}

/**
  * Boot up a server
  * @param {string|Server} name
  * @param {boolean} [connectTo] Username to connect. Default: false
  * @return {Error|void}
  */
function bootServer(name, connectTo) {
  var _old = serverName, _user = serverUser;

  if(name instanceof Server)
    name = name.ip();

  serversCommands[name] = clone(_commands);

  updateServer(name, servers[name].usersByRight('system')[0]);

  var apps = server.ls('/apps'), j;

  TOKEN = clone(TOKENS.system);

  for(j = 0; j < apps.length; j++)
    if(!startApp(apps[j], name))
      return new Error('Failed to start application ' + apps[j] + ' from server ' + name);

  if(!connectTo && _old)
    updateServer(_old, _user, true);
  else if(connectTo && connectTo !== true && connectTo !== servers[name].usersByRight('system')[0])
    updateServer(name, connectTo);
}

/**
  * Update the server
  * @param {string} name
  * @param {string} user
  * @param {boolean} [dontChdir]
  */
function updateServer(name, user, dontChdir) {
  serverName     = name;
  server         = servers[name];
  commands       = serversCommands[name];
  vars['server'] = (serverName.substr(0, 2) === '__' ? serverName.substr(2) : serverName);

  var $user      = server.user(user);
  var token_name = $user.token;
  TOKEN          = (typeof token_name === 'string' ? clone(TOKENS[token_name]) : token_name);
  serverUser     = user;
  vars['user' ]  = user;

  server.home('/users/' + user);

  if(gameStarted && !dontChdir)
    server.chdir($user.home);
}

/**
  * Log to a SSH server
  * @param {string} ip
  * @param {string} username
  * @param {boolean} [dontAddLog]
  */
function log_ssh(ip, username, dontAddLog) {
  updateServer(ip, username);

  if(!dontAddLog)
    serverLogged.push([ip, username]);

  for(var i = 0; i < ssh_events.log.length; i++)
    ssh_events.log[i](ip, username);
}

/**
  * Back to the previous SSH server
  */
function back_ssh() {
  serverLogged.pop();
  var target = serverLogged[serverLogged.length - 1];

  updateServer(target[0], target[1]);

  for(var i = 0; i < ssh_events.back.length; i++)
    ssh_events.back[i](ip, username);
}

/**
  * Back to the home SSH server
  */
function home_ssh() {
  serverLogged = [];
  updateServer(ipalias['local'], aliases['local'].usersByRight('admin')[0]);
}

/**
  * SSH event
  * @param {string} name
  * @param {function} callback
  */
function ssh_event(name, callback) {
  ssh_events[name].push(callback);
}

/**
  * Find in which enterprise (group in fact) is an IP adress
  * @param {string} ip
  * @return {string|boolean}
  */
function find_enterprise(ip) {
  var names = Object.keys(ipalias);
  for(var i = 0; i < names.length; i++)
    if(ipalias[names[i]] === ip) {
      if(names[i].indexOf('.') === -1)
        return false;
      else
        return names[i].substr(0, names[i].indexOf('.'));
    }
  return false;
}

/**
  * Custom setTimeout() function
  */
function $setTimeout() {
  if(fastdev)
    arguments[1] = 0;

  setTimeout.apply(window, arguments);
}

/**
  * Parse a network URL
  * @param {string} url
  * @param {string} [network] Default: "hypernet"
  * @return {object|boolean}
  */
function parseUrl(url, network) {
  var names = Object.keys(domains[network || 'hypernet']), IP, match, port;

  if(match = url.match(/^([a-zA-Z0-9_\-\.]+):([0-9]+)(\/(.*)|)$/)) {
    port = parseInt(match[2]);
    url  = match[1] + '/' + match[3];
  }

  for(var i = 0; i < names.length; i++) {
    if(url.substr(0, names[i].length + 1) === names[i] + '/') {
      IP  = domains[network || 'hypernet'][names[i]];
      url = url.substr(names[i].length + 1);
      break; // Break the loop to optimize performances
    } else if(url === names[i]) {
      IP  = domains[network || 'hypernet'][names[i]];
      url = '';
      break; // Idem
    }
  }

  return (IP ? {
    IP  : IP,
    url : url,
    port: port || 80
  } : false);
}

/**
  * Make an URL from IP adress and sub URL
  * @param {string} IP
  * @param {string} url
  * @param {number} [port]
  * @param {string} [network] Default: "hypernet"
  * @return {boolean|string}
  */
function makeUrl(IP, url, port, network) {
  var names = Object.keys(domains[network || 'hypernet']), domain;

  for(var i = 0; i < names.length; i++) {
    if(domains[network || 'hypernet'][names[i]] === IP) {
      domain = names[i];
      break;
    }
  }

  if(!domain)
    return false;

  return (domain + (port ? ':' + port.toString() : '') + '/' + url);
}

/**
  * Download a plain content
  * @param {string} content
  * @param {string} [filename]
  */
var blob_dw = (function() {
  var a = document.createElement("a");
  document.getElementById('invisible').appendChild(a);
  // Fix a bug with Microsoft Edge strict mode
  //a.style = "display: none";
  return function (data, fileName) {
      var blob = new Blob([data], {type: "octet/stream"}),
          url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName || 'blob.dw';
      a.click();
      window.URL.revokeObjectURL(url);
  };
}());

/**
  * Get a module
  * @param {string} name
  * @param {string} [server] Default: current server
  * @return {object}
  */
function require(name, server) {
  server = server || serverName;

  if(!modules.hasOwnProperty(server) || !modules[server].hasOwnProperty(name))
    throw new Error('Module "' + name + '" was not found');

  return modules[server][name];
}

var queue      = [];           // Commands' queue
var runningCmd = false;        // Is running a command ?
var vars       = {};           // All shell variables
var server     ;               // Current server's entity
var serverName ;               // Current server's name
var serverUser ;               // Player is logged as user...
var TOKEN      ;               // Player's token
var serverLogged = [];         // Names of logged in servers
var domains      = {};         // All domains DNS
var term_exec  ;

$('#wl').text('terminal');
// Define #terminal as a terminal
var term = $('#terminal').terminal(term_exec = function term_exec(cmd, term) {
  // Fix an unknown bug
  if(cmd.substr(0, 5) === '[i;;]' || cmd.substr(0, 4) === 'i;;]' || cmd.substr(0, 3) === 'i;;' || cmd.substr(0, 1) === ';')
    return ;

  // If there is a catch callback
  if(catchCommand) {
    // We store it in memory...
    var callback = catchCommand, ret;
    // To delete it in the variable (this permit to remove some bugs)
    catchCommand = null;
    // If the callback does no return 'true'
    if((ret = callback(cmd)) !== true && !dontRecoverPrompt)
      // We recover the prompt
      updatePrompt();

    if(dontRecoverPrompt && ret !== true)
      dontRecoverPrompt = true;

    if(!catchCommand && ret === RESTORE_COMMAND_CALLBACK)
      // We recover the catcher
      catchCommand = callback;
  } else {
    // Else, we run the command
    command(cmd);

    if(haskierHistory.length >= (save.data.max_history_size || 300))
      haskierHistory = haskierHistory.reverse().slice(0, (save.data.max_history_size || 300) - 1).reverse();

    haskierHistory.push(cmd);
  }
}, {
  greetings     : '',
  name          : 'haskier-terminal',
  prompt        : '$ ' ,
  linksNoReferer: true ,
  clear         : false,
  onInit        : function() {
    $('#terminal').append($('<div class="terminal-output"></div>').attr('id', 'autocomplete').html('<div><div style="width:100%;"><span></span></div></div>'));
  },
  keydown       : function(e) {
    // If there is a catch callback
    if(keydownCallback && !ignoreKeys) {
      // We store it in memory...
      var callback = keydownCallback, ret;
      // To delete it in the variable (this permit to remove some bugs)
      keydownCallback = null;
      // Run the callback
      var ret = callback(e);

      if(ret === RESTORE_KEYDOWN_CALLBACK)
        // Restore the callback
        keydownCallback = callback;

      // Prevent the key event
      return (ret !== DONT_PREVENT_KEYDOWN ? false : e);
    }

    // Ctrl+C : Clipboard copy
    if(e.ctrlKey && e.keyCode === 67 && window.hasOwnProperty('getSelection')) {
      // Copy to game's clipboard
      // We have to remove nonbreaking spaces because 'standard' spaces
      // ... don't exist in selected text (strange, isn't it ?)
      clipboard = noBreakingSpace(window.getSelection().toString());
      // If clipboardCopy() fails, then allow browser getting those keys
      // This line is unnecessary but if user want to copy text and paste it out of the game's window,
      // ... this line is helpful
      return clipboardCopy(clipboard) ? false : e;
    }

    // Ctrl+D : Dump selection to notepad
    // NOTE : If nothing is selected, will dump the clipboard's content
    if(e.ctrlKey && !e.shiftKey && e.keyCode === 68 && window.hasOwnProperty('getSelection')) {
      // Dump to notepad area
      var text = $('#notepad').text();
      $('#notepad').text((text ? text + '\n' : '') + (noBreakingSpace(window.getSelection().toString()) || clipboard));
      return false;
    }

    // Ctrl+F : Fullscreen
    if(e.ctrlKey && e.keyCode === 70) {
      if(document.body.requestFullscreen)
        document.body.requestFullscreen();
      else if(document.body.mozRequestFullScreen)
        document.body.mozRequestFullScreen();
      else if(document.body.webkitRequestFullScreen)
        document.body.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }

    // Shift+F12 : Toggle developpers tool
    // NOTE: Only works if game was launched in developper's mode
    if(e.shiftKey && e.keyCode === 123 && fastdev) {
      toggleDevTools();
      return false;
    }

    // F12 : Toggle browser developpers tool
    // NOTE: Only works if game was launched in developper's mode
    if(e.keyCode === 123 && fastdev)
      return ;

    // F5 : Refresh the page
    // NOTE: Only works if game was launched in developper's mode
    if(e.keyCode === 116 && fastdev) {
      window.location.reload();
      return ;
    }

    if(ignoreKeys)
      return false;

    // Ctrl+<key>

    // Ctrl+V : Clipboard paste
    // NOTE: Paste from the game's clipboard, not from the OS' one
    //       ... because there is no way to get it in JavaScript and
    //       ... I don't want to use a Flash or a Java hack, which are
    //       ... non-standard methods which wouldn't work on every browser
    if(e.ctrlKey && e.keyCode === 86) {
      // If this code is runned, we are sure that ignoreKeys == false and
      // ... there is no keydownCallback() to intercept the keys
      term.set_command(term.get_command() + clipboard);
      return false;
    }

    // Ctrl+B : Copy highlighted text and past it to the command line
    // NOTE: The clipboard is NOT affected by this operation
    if(e.ctrlKey && e.keyCode === 66) {
      term.set_command(term.get_command() + noBreakingSpace(window.getSelection().toString()));
      return false;
    }

    // Ctrl+K : Focus to notepad
    if(e.ctrlKey && e.keyCode === 75) {
      placeCaretAtEnd($('#notepad').get(0));
      $('#notepad').trigger('click');
      return false;
    }

    // Ctrl+Shift+D : Paste notepad's content
    // NOTE : If there are multiple lines, only first will be paste
    if(e.ctrlKey && e.shiftKey && e.keyCode === 68) {
      // Dump notepad to command line
      // For a mysterious reason, there are a lot of empty lines at the end of notepad's content
      // ... so we have to remove it !
      var text = $('#notepad').text().replace(/^\n$/gm, '').split('\n');
      term.set_command(term.get_command() + text[0]);
      $('#notepad').text(text.slice(1).join('\n'));
      return false;
    }

    // Exception for '&' which is deleted by jQuery.terminal for an unknown reason
    if(e.keyCode === 49) {
      term.set_command(term.get_command() + (e.shiftKey ? '1' : '&'));
      return false;
    }

    // Up key : History recall
    if(e.keyCode === 38) {
      if(haskierHistory.length >= historyRecall) {
        historyRecall += 1;
        term.set_command(haskierHistory[haskierHistory.length - historyRecall]);
      }

      return false;
    } else if(e.keyCode === 40) {
      if(historyRecall > 0) {
        historyRecall -= 1;

        if(historyRecall)
          term.set_command(haskierHistory[haskierHistory.length - historyRecall]);
        else
          term.set_command('');
      }

      return false;
    } else
      historyRecall = 0;

    var cmd = term.get_command(), split = cmd.split(' '), last = split[split.length - 1];

    if($('#autocomplete span').text().length) {
      if(e.keyCode === 27 || e.keyCode === 13)
        $('#autocomplete span').text('');
    } else if(e.keyCode === 27) {
      term.set_command('');
      return false;
    }

    // 'Return' key for 'clear' and 'exit' input
    if(e.keyCode === 13 && (cmd === 'clear' || cmd === 'exit')) {
      //command('clear');
      simulateShellWrited(cmd);
      term.set_command('');
      term_exec(cmd);
      return false;
    }

    if(e.keyCode !== 9 || catchCommand)
      return ;

    // Auto-completion
    var names, exists, args, base = split[0], completion = [], keys, has;
    var width = 12, itemPerLine = 6; /* Autocompletion output style */

    // If the command is a unique word
    if(split.length === 1) {
      // Then we autocomplete with command names
      keys = Object.keys(commands);

      for(var i = 0; i < keys.length; i++) {
        if(keys[i].substr(0, base.length) === base)
          completion.push(keys[i] + ' ');
      }
    } else {
      // We autocomplete with filenames AND command arguments
      exists = commands.hasOwnProperty(base);
      names  = [];

      if(!exists)
        console.warn(tr('Failed to autocomplete arguments because command "${cmd}" was not found', [base]));
      else if((args = commands[base].arguments).length) {
        for(var i = 0; i < args.length; i++) {
          has = (split.indexOf('--' + args[i].long) !== -1 || split.indexOf('-' + args[i].short) !== -1);

          if(args[i].long && !has && ('--' + args[i].long).substr(0, last.length) === last)
            names.push('--' + args[i].long + ' ')
          if(args[i].short && !has && ('-' + args[i].short).substr(0, last.length) === last)
            names.push('-' + args[i].short + ' ');
        }
      }

      // We add an asterisc, else search engine will think we want to find files with THIS filename
      // The '*' means "all filenames whichs starts by what we've given"
      completion = names.concat(server.glob(last/*base*/ + '*', ['names_list', 'add_folders_slash'].concat(last.substr(0, 1) === '/' ? [] : ['relative_path'])));
    }

    if(!completion.length)
      return false;

    split.pop();
    var without = split.length ? split.join(' ') + ' ' : '';

    if(completion.length === 1) {
      term.set_command(without + completion[0]);
      $('#autocomplete span').text('');
    } else {
      var tbl = [], str = '', max = 0;
      completion = completion.sort();

      for(var e = 0; e < completion.length; e++)
        max = Math.max(max, completion[e].length);

      for(e = 0; e < completion.length; e++) {
        str += escapeHtml(completion[e]) + ' '.repeat(Math.max(1, width - completion[e].length));

        if(str.length >= width * itemPerLine) {
          tbl.push(str);
          str = '';
        }
      }

      str = (tbl.join('<br/>') + (tbl.length ? '<br/>' : '') + str).replace(/ /g, '&nbsp;');
      $('#autocomplete span').html(str);
    }

    return false;
  }
});

// Load game save
var saveSupport = hasLocalStorage && localStorageWorking;
  // Is save system supported ?
var save, is_save; // Is there a valid save ?

$('#wl').text('user save');

if(!saveSupport)
  alert(tr('Your browser doesn\'t support localStorage feature. Your will not be able to save your game.\nTo save your progression, please use a newer browser or update this one.'));
else {
  try { localStorage.setItem('__localStorage_test', 'abcdefghij'.repeat(25000) /* 250 Kb */); }
  catch(e) { alert(tr('localStorage test has failed. You will perhaps not be able to save your game.')); }

  localStorage.removeItem('__localStorage_test');

  if(save = localStorage.getItem('haskier')) {
    try      { save = JSON.parse(reverse(LZString.decompressFromUTF16(save))); }
    catch(e) { alert(tr('Your Haskier\'s save seems to be corrupted.\nThe save will be deleted, sorry.')); console.info('Haskier save is corrupted'); localStorage.setItem('haskier_corrupted_backup', save); localStorage.removeItem('haskier'); save = null; }

    if(typeof save === 'object' && save) {
      if(save.time < 1458222083408 /* Time when this feature was created */) {
        // That ISN'T an Haskier save because time is not valid !
        localStorage.removeItem('haskier');
      } else {
        is_save = true;
        console.info('A valid Haskier save was found | ' + (new Date(save.time)).toString());
      }
    }
  }
}

save = save || {data: {}};

if(!is_save) {
  // Initialize shell variables
  // Define some shell vars
  vars.shell = 'Hasshell';
  vars.name  = 'Shaun';

  // Define default colors
  vars['$c_green' ] = '#00FF00';
  vars['$c_blue'  ] = '#1FA7FF';
  vars['$c_red'   ] = '#FE1B00';
  vars['$c_purple'] = '#8066B3';

  vars.haskier  = '${f_cyan,italic:Haskier}';
  vars.hypernet = '${f_#8066B3,bold,italic:HyperNet}';

  // Initialize the terminal
  term.clear();
} else {
  // Restore variables
  vars = save.vars;
  // Fix a bug with jQuery.terminal plugin
  save.view.interpreters = term.export_view().interpreters;
  // Import commands history
  haskierHistory = save.history;
  // Restore notepad
  $('#notepad').html(save.notepad);
}

vars.scope   = scope  ;
vars.ipalias = ipalias;
vars.aliasip = aliasip;

// Define the TOKENS collection
// WARNING: Do NOT end a path by a slash
// EXEMPLE: include: ['/'] -> exclude: []
var TOKENS = {
  system: {
    catch: '*'
  },

  admin: {
    catch: '*',
    exclude: ['/.sys'],
    excludeRead: ['/.sys', '/apps']
  },

  guest: {
    catch: [],
    include: ['/users/guest'],
    includeRead: ['/users/guest']
  }
};

// A little (but useful !) alias :)
TOKENS['user'] = TOKENS['guest'];

// Define some callbacks
var afterCommand, catchCommand, keydownCallback;
// Load game
var haskier, game, didSomethingAfterSave = false, HSF_files = {}, commands = {}, serversCommands = {};

$('#wl').text('game itself');

$.ajax({
  url     : 'com/get-game.run',
  dataType: 'json',
  cache   : false,
  success : function(data) {
    haskier = data;

    try      { game = HSF.parse(data.hsf['main.hsf'], scope, data.hsf); }
    catch(e) { report_bug('Failed to load scenaristic script', e.stack); }

    ready();
  },
  error: function(err) {
    alert(tr('Failed to load game. Please refresh the page.'));
  }
});
