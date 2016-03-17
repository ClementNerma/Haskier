'use strict';

$('body > *').hide();

/**
  * Start the game !
  */
function go() {
  $('body > *').show();
}

/**
  * Save the game
  */
function saveGame() {
  try {
    localStorage.setItem('haskier', JSON.stringify({
      view    : term.export_view(),
      vars    : vars,
      time    : (new Date()).getTime(),
      tools   : is_save ? save.tools : {},
      server  : server.export()
    }));
  }

  catch(e) {
    alert(tr('Failed to save game. Please try again. If that doesn\'t work, type `force-save` in the terminal and press Return.'));
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

  term.pause();

  var cmd    = queue.splice(0, 1)[0];
  runningCmd = true;

  exec(cmd, function() {
    term.resume();
    runningCmd = false;
    saveGame();

    if(queue.length)
      treatQueue();
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
  * Update the terminal's prompt
  */
function updatePrompt() {
  term.set_prompt(format('${green:${name}}:${blue:' + '/' + '}$ '));
}

var queue      = [];           // Commands' queue
var runningCmd = false;        // Is running a command ?
var vars       = {};           // All shell variables
var server     = new Server(); // Server entity

// Define #terminal as a terminal
var term = $('#terminal').terminal(function(cmd, term) {
  command(cmd);
}, {
  greetings    : '',
  name         : 'haskier-terminal',
  prompt       : '$ ',
  tabcompletion: true,
  completion   : function(term, cmd, callback) {
    // TODO : Autocompletion for filenames !
    callback(Object.keys(commands));
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
var saveSupport = false; // Is save system supported ?
var save, is_save;       // Is there a valid save ?

if(typeof localStorage !== 'object' || typeof localStorage.setItem !== 'function' || typeof localStorage.getItem !== 'function' || typeof localStorage.removeItem !== 'function' || typeof localStorage.clear !== 'function')
  alert(tr('Your browser doesn\'t support localStorage feature. Your will not be able to save your game.\nTo save your progression, please use a newer browser or update this one.'));
else {
  saveSupport = true;

  try {localStorage.setItem('__localStorage_test', 'abcdefghij'.repeat(5000)); }
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
        console.info('A (valid) Haskier save was found');
      }
    }
  }
}

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

  // Initialize the terminal
  term.clear();
  updatePrompt();
} else {
  // Restore variables
  vars = save.vars;
  // Initialize the server
  server.import(save.server);
  // Fix a bug with jQuery.terminal plugin
  save.view.interpreters = term.export_view().interpreters;
  // Import view...
  term.import_view(save.view);
  // ... and update prompt !
  updatePrompt();
}

// Define some callbacks
var afterCommand, beforeCommand;
// Load game
var serverGame, game;

$.ajax({
  url: 'com/get-game.run',
  dataType: 'json',
  success: function(data) {
    serverGame = data;
    game = HSF.parse(data['scenario.hsf']);

    if(typeof game === 'string')
      alert(tr('Received data are not valid. Please try later.\n\nDetails :\n${err}', [game]));
    else
      go();
  },
  error: function(err) {
    alert(tr('Failed to load game. Please refresh the page.'));
  }
})
