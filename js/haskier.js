'use strict';

var hidden = $('#terminal, #fullscreen_trigger').hide(),
  dontRecoverPrompt = false, hsf_conds = [], todo = [], justRestored = false, justRestoredLabel = false,
  ignoreKeys = false;

/*const*/var readingLineDuration = 50;
const backup_prefix = 'hbak_auto_';

/**
  * Start the game !
  */
function ready() {
  hidden.show();

  game.event('label', function() {
    if(game.getVar('FREEZE_UNTIL_TODO'))
      game.setVar('dont_update_prompt', true);

    if(!justRestoredLabel)
      saveGame(); // useless ?
    else
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

  go();
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
    var lastSave = localStorage.getItem('haskier');

    localStorage.setItem('haskier', JSON.stringify({
      view    : term.export_view(),
      vars    : vars,
      time    : (new Date()).getTime(),
      data    : save.data,
      server  : server.export(),
      scope   : game.diffScope(),
      label   : game.label(),
      marker  : game.marker(),
      dsas    : didSomethingAfterSave
    }));

    // Backup the previous save
    if(lastSave && localStorageFree() > lastSave.length + 16) {
      var id = 1, name;

      while(localStorage.getItem(name = backup_prefix + id))
        id++;

      try { localStorage.setItem(name, lastSave); }
      catch(e) { console.error('Failed to backup last Haskier save\n' + e.stack); }
    } else if(lastSave) {
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
        try { localStorage.setItem(backup_prefix + (parseInt(backups[backups.length - 1]) + 1), lastSave); }
        catch(e) { console.error('Failed to backup last Haskier save\n' + e.stack); }
      } else {
        if(backups.length)
          console.warn('There is no enough total space to backup last save');
        else
          console.warn('Even if deleting ' + backups.length + ' backups, there is not enough space to backup last save');
      }
    }
  }

  catch(e) {
    alert(tr('Failed to save game. Please try again. If that doesn\'t work, type `force-save` in the terminal and press Return.'));
    console.error('Failed to save game\n' + e.stack);
  }

  vars.scope = scope;
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
  * Run a command
  * @param {string} cmd
  */
function command(cmd) {
  if(!cmd)
    return ;

  queue.push(cmd);

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

  var cmd    = queue.splice(0, 1)[0];
  runningCmd = true;

  exec(cmd, function() {
    ignoreKeys = false; //term.resume(); // $('#cover').hide(); -> doesn't work better
    runningCmd = false;
    didSomethingAfterSave = true;
    saveGame();

    if(queue.length)
      treatQueue();
    else if(todo.length) {
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
  });
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
        else {
          // Because argument is not required, we put an empty argument instead
          prepare.push(undefined);
        }
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

    if((arg.regex && typeof prepare[prepare.length - 1] !== 'undefined' && !arg.regex.test(asPlain(prepare[prepare.length - 1])))
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
  */
function exec(cmd, callback) {
  var prepare;

  callback = callback || function(){};
  cmd      = parseCommand(cmd);

  if(!commands.hasOwnProperty(cmd.$)) {
    display('${red:' + tr('command not found : ${cmd}', [cmd.$]) + '}');
    callback();
    return ;
  }

  var call = commands[cmd.$];

  // TODO : Display the exact problem
  if(typeof (prepare = prepareArguments(cmd, call.arguments)) === 'string') {
    display('${red:' + tr('bad syntax for command `${cmd}` : ${err}', [cmd.$, prepare]) + '}');
    callback();
    return ;
  }

  prepare = prepare.concat(call.async ? [callback, cmd] : cmd);

  call.callback.apply(window, prepare);

  if(!call.async) {
    runningCmd = false;
    callback();
  }
}

/**
  * Parse a command with arguments
  * @param {string} cmd
  * @return {object}
  */
function parseCommand(cmd) {
  var parse = jQuery.terminal.parseCommand(cmd);

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
  //$('#infos')[save.data.showInfobar ? 'show' : 'hide']();
}

/**
  * Update the terminal's prompt
  */
function updatePrompt() {
  if(game && !game.getVar('dont_update_prompt'))
    term.set_prompt(format('${green:${name}}:${blue:' + server.chdir() + '}$ '));
}

var queue      = [];           // Commands' queue
var runningCmd = false;        // Is running a command ?
var vars       = {};           // All shell variables
var server     = new Server(); // Server entity

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

      if(!catchCommand)
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
  tabcompletion: true,
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
  },
  completion   : function(term, word, callback) {
    // If there is a catch callback
    if(catchCommand) {
      // We don't have to autocomplete the input
      callback([]);
      // Stop the function
      return ;
    }

    var cmd = term.get_command(), names, exists, args, base = cmd.split(' ')[0];

    // If the command is a unique word
    if(cmd === word)
      // Then we autocomplete with command names
      callback(Object.keys(commands));
    else {
      // We autocomplete with filenames AND command arguments
      exists = commands.hasOwnProperty(base);
      names  = [];

      if(!exists)
        error(tr('Failed to autocomplete arguments because command "${cmd}" was not found', [base]));
      else if((args = commands[base].arguments).length) {
        for(var i = 0; i < args.length; i++) {
          if(args[i].long)
            names.push('--' + args[i].long)
          if(args[i].short)
            names.push('-' + args[i].short);
        }
      }

      // We add an asterisc, else search engine will think we want to find files with THIS filename
      // The '*' means "all filenames whichs starts by what we've given"
      callback(names.concat(server.glob(word + '*', ['names_list', 'add_folders_slash'])));
    }
  },
  clear        : true
});

// Define trigger usage
$('#fullscreen_trigger').on('click', function() {
  // Go fullscreen !
  var el = term.get(0);
  if(el.requestFullscreen)
      el.requestFullscreen();
  else if (el.mozRequestFullScreen)
      el.mozRequestFullScreen();
  else if (el.webkitRequestFullScreen)
      el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
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
  // Initialize the server
  server.import(save.server);
  // Fix a bug with jQuery.terminal plugin
  save.view.interpreters = term.export_view().interpreters;
  // Import view...
  //term.import_view(save.view);
}

// Update interface
updateUI();

// Define global HSF scope
var scope = {
  display: function(text) {
    display(game.getVar('ALLOW_TRANSLATION') ? tr(text) : text);
    go();
  },

  human: function(text) {
    display(game.getVar('ALLOW_TRANSLATION') ? tr(text) : text, go);
  },

  clear: function() {
    term.clear(); go();
  },

  question: function(msg) {
    dontRecoverPrompt = true;
    question(game.getVar('ALLOW_TRANSLATION') ? tr(msg) : msg, function(answer) {
      // Question callback
      game.setVar('answer', answer);
      dontRecoverPrompt = null;
      go();
    });
  },

  choice: function() {
    dontRecoverPrompt = true;
    term.echo(' ');

    if(game.getVar('ALLOW_TRANSLATION')) {
      for(var i = 0; i < arguments.length; i++)
        arguments[i] = tr(arguments[i]);
    }

    choice(arguments, function(answer) {
      // Choice callback
      dontRecoverPrompt = null;
      term.echo(' ');
      game.setVar('answer', answer);
      go();
    });
  },

  confirm: function(msg) {
    dontRecoverPrompt = true;
    term.echo(' ');
    confirm(game.getVar('ALLOW_TRANSLATION') ? tr(msg) : msg, function(answer) {
      // Confirm callback
      dontRecoverPrompt = null;
      term.echo(' ');
      game.setVar('answer', answer);
      go();
    });
  },

  leave: function(dontGo) {
    // Permit prompt to refresh again, update it and permit user to access the terminal
    game.setVar('dont_update_prompt', false);
    updatePrompt();
    catchCommand = false;

    if(!dontGo)
      go();
  },

  freeze: function() {
    // If 'FREEZE_UNTIL_TODO' var is set to true, we make prompt unable to refresh
    game.setVar('dont_update_prompt', true);
    go();
  },

  restore: function(dontRestoreScope) {
    // Restore the checkpoint
    if(save.label) {
      justRestoredLabel = true;

      if(!game.goLabel(save.label)) {
        console.error('Failed to go to label "' + save.label + '"');
        justRestoredLabel = false;
      } else {
        if(save.dsas) {
          game.pass();

          while(game.current(1)) {
            if(game.current(1).js && game.current(1).js.match(/^todo *\(/))
              break;

            game.pass();
          }
        }

        term.import_view(save.view);
      }

      justRestored = true; // put it here or in {if(game.goLabel) ???}
    }

    // If the save contains the script's diff scope, restore it
    if(save.scope && !dontRestoreScope) {
      var keys = Object.keys(save.scope);

      for(var i = 0; i < keys.length; i++)
        scope[keys[i]] = save.scope[keys[i]];
    }

    go();
  },

  server: server,
  save  : save,
  game  : game,

  todoModels: {},
  setTodoModel: function(name, model) {
    scope.todoModels[name] = model;
    go();
  },
  todo: function() {
    // todo = []; // useless here

    // If 'FREEZE_UNTIL_TODO' var is set to true, we make user able again to use terminal
    // ... because it was frozen
    if(game.getVar('FREEZE_UNTIL_TODO'))
      scope.leave(true);

    // Prepare the todo list...
    for(var i = 0; i < arguments.length; i++) {
      if(typeof arguments[i] === 'string')
        todo.push(scope.todoModels[arguments[i]]);
      else
        todo.push(arguments[i]);
    }

    if(!justRestored) {
      didSomethingAfterSave = false;
      saveGame();
    } else justRestored = false;
  },

  goto: function(label) {
    game.goLabel(label);
    go();
  },

  repeat: function(label) {
    game.repeatLabel();
    go();
  },

  next: function(label) {
    game.nextLabel();
    go();
  },

  wait: function(time) {
    if(typeof time === 'string') {
      display(time);
      keydownCallback = go;
    } else {
      ignoreKeys = true;
      setTimeout(function() {
        ignoreKeys = false;
        go();
      }, time);
    }
  },

  localStorageStats: function() {
    scope.answer = localStorageStats();
    go();
  }
};

vars.scope = scope;

// Define some callbacks
var afterCommand, catchCommand, keydownCallback;
// Load game
var serverGame, game, didSomethingAfterSave = false, HSF_files = {};

$.ajax({
  url     : 'com/get-game.run',
  dataType: 'json',
  cache   : false,
  success : function(data) {
    serverGame = data;

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
