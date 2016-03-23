'use strict';

// TODO: FIXBUG: When refresh page two times, progression is reset

var hidden = $('#terminal, #clock').hide(),
  dontRecoverPrompt = false, hsf_conds = [], todo = [], justRestored = false, justRestoredLabel = false,
  ignoreKeys = false, gameStarted = false, clock, clockInterval, clockRefresh, cmd_out = [], buff_out = [],
  redirection = false, fastMode = !!location.search.match(/(\?|&)fastmode=true(&|$)/);

/*const*/
var   readingLineDuration = 50;
var   humanSpeed          = 80;
const backup_prefix       = 'hsk_arch_';

//var clone=function(t){var r=new Array,e=function(t){if("undefined"!=typeof Object.getPrototypeOf)return Object.getPrototypeOf(t);var r=new Object;return"undefined"!=typeof t.__proto__&&"undefined"!=typeof r.__proto__&&r.__proto__===Object.prototype?t.__proto__:"undefined"!=typeof t.constructor&&"undefined"!=typeof r.constructor&&r.constructor===Object&&"undefined"!=typeof t.constructor.prototype?t.constructor.prototype:Object.prototype},o=function(t){if("object"!=typeof t)return t;if(null===t)return null;for(var n=0;n<r.length;n++)if(r[n][0]===t)return r[n][1];if(Array.isArray(t)){var p=[];p.prototype=e(t),r.push([t,p]);for(var f in t)p[f]=o(t[f])}else{var u=new Function;u.prototype=e(t);var p=new u;r.push([t,p]);for(var c in t)t.hasOwnProperty(c)&&(p[c]=o(t[c]))}return p};return o(t)};
var clone = (new Server('@model')).clone;

/**
  * Start the game !
  */
function ready() {
  var started = Date.now();

  hidden.show();

  clock = save.clock ? new Date(save.clock) : Date.parse('03/07/2016 19:10:00');

  game.event('label', function(name, marker, step) {
    if(game.getVar('FREEZE_UNTIL_TODO'))
      game.setVar('dont_update_prompt', true);

    if(!justRestoredLabel) {
      saveGame();

      if(step.data === 'checkpoint') {
        var err = backupSave();
        if(err) console.error(err);
      }
    } else
      justRestoredLabel = false;
  });

  game.event('display', function(text, i, code) {
    if(game.getVar('human_talking'))
      scope.human(game.getVar('human_talking') + ' :  ' + text);
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

  game.event('include', function(filename) {
    if(!HSF_files[filename])
      console.error('Scenaristic file /hsf/' + filename + ' was not found');

    return HSF_files[filename];
  });

  var names = Object.keys(haskier.servers), name, apps, j, d, commands, l;

  for(var i = 0; i < names.length; i++) {
    name = names[i];
    //servers[name] = new Server();
    (new Server(name));

    if(save.servers && save.servers[name])
      servers[name].import(save.servers[name]);
    else {
      /*try {*/ servers[name].import(haskier.servers[names[i]], 'files'); //}
      //catch(e) { alert(tr('Failed to load game. Please try later.')); console.error('Failed to parse server\'s file "' + name + '" :\n' + e.stack); }

      try { servers[name].import(JSON.parse(haskier.servers[names[i]]['.sys']['server.sys']).networks || [], 'networks'); }
      catch(e) { }
    }
  }

  if(!save.time && haskier['install.js'])
    window.eval(haskier['install.js']);

  display(tr('Starting up the servers...'));
  console.log('Starting up servers...');

  for(i = 0; i < names.length; i++) {
    display(tr('Starting up server ${num} of ${total}...', [i + 1, names.length]))

    d = Date.now();
    apps = servers[names[i]].glob('apps/*/app.hps');
    serversCommands[names[i]] = clone(_commands);

    //startApp(apps[j].vars[0], names[i]);

    for(j = 0; j < apps.length; j++)
      startApp(apps[j].vars[0], names[i]);

    if(servers[names[i]].fileExists('/user/init.hss')) {
      updateServer(names[i]);
      commands = server.readFile('/user/init.hss').split('\n');

      for(l = 0; l < commands.length; l++)
        command(commands[l]);
    }

    console.log('Starting up server ' + (i + 1) + '/' + names.length + ' (' + (Date.now() - d) + ' ms)');
  }

  console.info('All servers were started !');

  display(tr('Preparing networks...'));
  console.info('Preparing networks...');

  names = Object.keys(haskier.networks);

  for(var i = 0; i < names.length; i++)
    networks[names[i].substr(0, names[i].lastIndexOf('.'))] = new Network(haskier.networks[names[i]]);

  /* Clock setup */

  clockRefresh = function() {
    $('#clock').text(clock.toString('d') + ' ' + clock.toString('t'));
  };

  setTimeout(function() {
    setInterval(clockRefresh, 60 * 1000);
  }, ((60 - clock.getSeconds()) * 1000));
  clockRefresh();

  term.clear();
  updateServer(save.server || '__local');
  updateUI();

  gameStarted = true;
  console.info('Game started in ' + (Date.now() - started) + ' ms');

  go();
}

/**
  * Start an app on a server
  * @param {string} app
  * @param {string} [serverName]
  */
function startApp(app, serverName) {
  var _server = serverName ? servers[serverName] : server;

  (new Function(['server', 'register'], _server.readFile('/apps/' + app + '/app.hps'))).apply(window, [_server, function(name, command) {
    if(typeof command.legend !== 'string' || !Array.isArray(command.arguments) || typeof command.callback !== 'function')
      fatal('Can\'t register invalid command "' + name + '"');

    serversCommands[serverName || '__local'][name] = command;
  }]);
}

/**
  * Run the next game's instruction
  */
var go = function() {
  /*if(game.finished())
    return ;*/

  game.step();
};

/**
  * Save the game
  */
function saveGame() {
  if(!saveSupport)
    return console.warn('saveGame() was ignored because localStorage doesn\'t work');

  delete vars.scope;

  try {
    var lastSave = localStorage.getItem('haskier'), _servers = {}, names = Object.keys(servers);

    // Export all servers
    for(var i = 0; i < names.length; i++)
      _servers[names[i]] = servers[names[i]].export();

    localStorage.setItem('haskier', JSON.stringify({
      view    : term.export_view(),
      vars    : vars,
      time    : (new Date()).getTime(),
      data    : save.data,
      servers : _servers,
      clock   : clock.getTime(),
      server  : serverName,
      scope   : game.diffScope(),
      label   : game.label(),
      marker  : game.marker(),
      dsas    : didSomethingAfterSave
    }));
  }

  catch(e) {
    alert(tr('Failed to save game. Please try again. If that doesn\'t work, type `force-save` in the terminal and press Return.'));
    console.error('Failed to save game\n' + e.stack);
  }

  vars.scope = scope;
}

/**
  * Backup the current save
  * @param {boolean} [allowDeletingOlder] Default: false
  * @return {string|void} String = error message (translated)
  */
function backupSave(allowDeletingOlder) {
  // Backup the previous save
  var lastSave = localStorage.getItem('haskier');

  if(!lastSave)
    return false;

  try {
    if(localStorageFree() > lastSave.length + 16) {
      var id = 1, name;

      while(localStorage.getItem(name = backup_prefix + id))
        id++;

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
  */
function command(cmd, add) {
  if(!cmd)
    return ;

  queue.push([cmd, add]);

  if(!runningCmd)
    treatQueue();
}

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

    if(queue.length)
      treatQueue();
    else if(todo.length && gameStarted) {
      // Here, we've wait queue is empty to check if todo is accomplished
      // And because condition contains 'todo.length' we know that todo list is not empty

      for(var i = 0; i < todo.length; i++) {
        if(window.eval(todo[i])) {
          todo.splice(i, 1);
          i--;
        }
      }

      if(!todo.length)
        go();
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
  var prepare = [], arg, _ = args._, j = -1;

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

    if((arg.regex && typeof prepare[prepare.length - 1] !== 'undefined' && typeof prepare[prepare.length - 1] !== 'string')
    || (arg.regex && typeof prepare[prepare.length - 1] !== 'undefined' && !arg.regex.test(asPlain(prepare[prepare.length - 1])))
    || (arg.check && typeof prepare[prepare.length - 1] !== 'undefined' && !arg.check(prepare[prepare.length - 1]))) {
        return arg.error || tr('Bad value was specified for argument ${arg}', [
          arg.short && arg.long ? '-' + arg.short + '|--' + arg.long :
            arg.short ? '-' + arg.short :
              arg.long ? '--' + arg.long :
                i
        ]);
    }
  }

  return prepare;
}

/**
  * Execute a command without queue
  * @param {string} cmd
  * @param {function} [callback]
  * @param {*} [add] Additionnal data
  */
function exec(cmd, callback, add) {
  var prepare, filter, filter_name, tmp, symbol, file, input;
  runningCmd = true;
  callback   = callback || function(){};

  // If the '>' symbol is present within the command
  if((symbol = cmd.indexOf('>')) !== -1) {
    // Check it's not between quotes
    file   = cmd.substr(cmd.indexOf('>') + 1);
    tmp    = cmd.substr(0, symbol - 1);
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
    tmp    = cmd.substr(0, symbol - 1);
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
      add = server.readFile(input.trim());

      if(typeof add !== 'string') {
        runningCmd = false;
        display_error(tr('Failed to read ${input} as input file', [input]));
        callback();
        return ;
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

  if(!commands.hasOwnProperty(cmd.$)) {
    runningCmd = false;
    display_error(tr('command not found : ${cmd}', [cmd.$]));
    callback();
    return ;
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
            server.writeFile(file, buff_out.join('\n'));
            callback();
          }, cmd_out.join('\n'));
        } else {
          outputFilter = false;
          exec(filter, null, cmd_out.join('\n'));
          callback.apply(this, arguments);
        }
      } else if(file) {
        outputFilter = false;
        server.writeFile(file, cmd_out.join('\n'));
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
          server.writeFile(file, buff_out.join('\n'));
          callback.apply(this, arguments);
        }, cmd_out.join('\n'));
      } else {
        outputFilter = false;
        exec(filter, callback, cmd_out.join('\n'));
      }
    } else if(file) {
      outputFilter = false;
      server.writeFile(file, cmd_out.join('\n'));
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
  * Update the entire UI
  */
function updateUI() {
  updatePrompt();
  $('.terminal, .cmd').css('font-family', (save.data.font ? save.data.font + ', ' : '') + 'Consolas, Courier, "Inconsolata"');

  if(save.data.lineWaiting)
    readingLineDuration = save.data.lineWaiting;

  if(save.data.writingSpeed)
    humanSpeed = save.data.writingSpeed;

  if(fastMode) { readingLineDuration = humanSpeed = 0; }
  //$('#infos')[save.data.showInfobar ? 'show' : 'hide']();
}

/**
  * Update the terminal's prompt
  */
function updatePrompt() {
  if(game && !game.getVar('dont_update_prompt'))
    term.set_prompt(format('${green:${name}}:${blue:' + server.chdir() + '}$ '));
}

/**
  * Update the server
  * @param {string} name
  */
function updateServer(name) {
  serverName = name;
  server     = servers[name];
  commands   = serversCommands[name];
}

var queue      = [];           // Commands' queue
var runningCmd = false;        // Is running a command ?
var vars       = {};           // All shell variables
var server     ;               // Current server's entity
var serverName ;               // Current server's name
var networks   = {};           // All networks instances

// Define #terminal as a terminal
var term = $('#terminal').terminal(function(cmd, term) {
  // Fix an unknown bug
  if(cmd.substr(0, 5) === '[i;;]')
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
    else {
      //if(ret === true)
        dontRecoverPrompt = false;

      if(!catchCommand && ret === true)
        // We recover the catcher
        catchCommand = callback;
    }
  } else
    // Else, we run the command
    command(cmd);
}, {
  greetings    : '',
  name         : 'haskier-terminal',
  prompt       : '$ ',
  onInit       : function() {
    $('#terminal').append($('<div class="terminal-output"></div>').attr('id', 'autocomplete').html('<div><div style="width:100%;"><span></span></div></div>'));
  },
  keydown      : function(e) {
    if(ignoreKeys)
      return false;

    // If there is a catch callback
    if(keydownCallback) {
      // We store it in memory...
      var callback = keydownCallback, ret;
      // To delete it in the variable (this permit to remove some bugs)
      keydownCallback = null;
      // If the callback does returns 'true'
      if(callback(e) === true)
        // Restore the callback
        keydownCallback = callback;

      // Prevent the key event
      return false;
    }

    var cmd = term.get_command(), split = cmd.split(' '), last = split[split.length - 1];

    if($('#autocomplete span').text().length) {
      if(e.keyCode === 27 || e.keyCode === 13)
        $('#autocomplete span').text('');
    }

    if(e.keyCode === 13 && cmd === 'clear') {
      command('clear');
      return false;
    }

    if(e.keyCode !== 9 || catchCommand)
      return ;

    // Auto-completion
    var names, exists, args, base = split[0], completion = [], keys, has;
    var width = 8, itemPerLine = 4; /* Autocompletion output style */

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
        error(tr('Failed to autocomplete arguments because command "${cmd}" was not found', [base]));
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
      completion = names.concat(server.glob(last/*base*/ + '*', ['names_list', 'add_folders_slash']));
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

      for(var e = 0; e < completion.length; e++)
        max = Math.max(max, completion[e].length);

      for(e = 0; e < completion.length; e++) {
        str += escapeHtml(completion[e]) + '&nbsp;'.repeat(Math.max(1, width - completion[e].length));

        if(str.length >= width * itemPerLine) {
          tbl.push(str);
          str = '';
        }
      }

      str = tbl.join('\n') + (tbl.length ? '\n' : '') + str;
      $('#autocomplete span').html(str);
    }

    return false;
  },
  clear: false
});

// Load game save
var saveSupport = hasLocalStorage && localStorageWorking;
  // Is save system supported ?
var save, is_save; // Is there a valid save ?

if(!saveSupport)
  alert(tr('Your browser doesn\'t support localStorage feature. Your will not be able to save your game.\nTo save your progression, please use a newer browser or update this one.'));
else {
  try {localStorage.setItem('__localStorage_test', 'abcdefghij'.repeat(25000) /* 250 Kb */); }
  catch(e) { alert(tr('localStorage test has failed. You will perhaps not be able to save your game.')); }

  localStorage.removeItem('__localStorage_test');

  if(save = localStorage.getItem('haskier')) {
    try      { save = JSON.parse(save); }
    catch(e) { alert(tr('Your Haskier\'s save seems to be corrupted. The save will be deleted, sorry.')); console.info('Haskier save is corrupted'); localStorage.setItem('haskier_corrupted_backup', save); localStorage.removeItem('haskier'); }

    if(typeof save === 'object') {
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
  // Import view...
  //term.import_view(save.view);
}

// Update interface
// updateUI();

vars.scope  = scope;

// Define some callbacks
var afterCommand, catchCommand, keydownCallback;
// Load game
var haskier, game, didSomethingAfterSave = false, HSF_files = {}, commands = {}, serversCommands = {};

$.ajax({
  url     : 'com/get-game.run',
  dataType: 'json',
  cache   : false,
  success : function(data) {
    haskier = data;

    // Parse all scenaristic files
    var filenames = Object.keys(data.hsf);

    for(var i = 0; i < filenames.length; i++)
      HSF_files[filenames[i]] = HSF.parse(data.hsf[filenames[i]], scope);

    game = HSF_files['main.hsf'];

    ready();
  },
  error: function(err) {
    alert(tr('Failed to load game. Please refresh the page.'));
  }
});
