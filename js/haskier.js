'use strict';

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

var queue      = [];    // Commands' queue
var runningCmd = false; // Is running a command ?
var vars       = {};    // All shell variables

// Define #terminal as a terminal
var term = $('#terminal').terminal(function(cmd, term) {
  command(cmd);
}, {
  greetings    : '',
  name         : 'Haskier',
  prompt       : '$ ',
  tabcompletion: true,
  completion   : function(term, cmd, callback) {
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
