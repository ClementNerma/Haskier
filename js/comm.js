'use strict';

/**
  * Report a bug
  * @param {string} error
  * @param {object} vars
  */
function report_bug(error, vars) {
  // Display the variables as a beautiful JSON !
  vars = JSON.stringify(vars || {}, null, 4);

  console.error(error); if(Object.keys(vars).length) console.error(vars);

  // Ask the user for reporting the bug
  //if(_confirm(tr('A bug has been detected. Would you like to report it ?\n\nDetails :\n${err}\n\n${vars}', [error, vars])))
    // Send the request to the server
    $.ajax({
      url   : 'com/bug-report.run',
      method: 'GET',
      data  : {
        message: (new Error(error)).stack + ' || ' + vars,
        time   : (new Date()).getTime()
      },
      success: function() {
        console.log('A bug was reported just now.');
        //alert(tr('Bug has been reported. Thank you !'));
      },
      error: function(req) {
        console.error('Failed to report bug to server\n' + req.responseText);
        //alert(tr('Failed to report bug to server ;('));
      }
    });
}

var outputFilter;

/**
  * Check if a char code is printable
  * @param {number} charCode
  * @param {boolean} [preventNewLine] If true, will not accept char code 13 (new line). Default: false
  * @return {boolean}
  */
function is_printable(charCode, preventNewLine) {
  return ((
    (charCode > 47  && charCode <  58 ) || // number keys
    charCode == 32  || charCode == 13   || // spacebar & return key(s) (if you want to allow carriage returns)
    (charCode > 64  && charCode <  91 ) || // letter keys
    (charCode > 95  && charCode <  112) || // numpad keys
    (charCode > 185 && charCode <  193) || // ;=,-./` (in order)
    (charCode > 218 && charCode <  224)    // [\]' (in order)
  ) && (preventNewLine ? charCode !== 13 : true));
}

/**
  * Display a text, considering filters
  * @param {*} text
  */
function echo(text) {
  if(typeof outputFilter === 'function')
    outputFilter(text);
  else
    term.echo(text);
}

/**
  * Display an error
  * @param {string} message
  * @param {object} [supp]
  */
function error(message, supp) {
  console.error(message);
  // Treat supplemental data (like an Error)
  if(supp) console.error(supp);

  // Display the error in the informations bar
  //$('#infos').text(message).css('color', 'red');
}

/**
  * Fatal error !
  * @param {string} message
  */
function fatal(message) {
  term.set_prompt('');
  ignoreKeys = true;
  alert(tr('Game has stopped because of a fatal error') + ' :\n' + message);
  display_error(message);
  throw new Error(message);
}

/* Removed info() message */

/**
  * Format variables calls in a string
  * @param {string} str
  * @param {boolean} [removeInexistant] Remove all inexistant variables. Default: false
  * @param {object} [vars] All variables. If omitted, will take `vars` as referer
  * @return {string}
  */
function formatVars(text, removeInexistant, vars) {
  return text.replace(/\${([a-zA-Z0-9_\.\[\]"' ]+)}/g, function(match, val) {
    try      { return math.eval(val.trim().replace(/'/g, '"'), vars || window.vars); }
    catch(e) { return (removeInexistant ? '' : text); }
  });
}

/**
  * Format all vars in an object. THIS WILL MODIFY THE SOURCE OBJECT !
  * @param {object} source
  * @param {object} [vars]
  * @return {object} source
  */
function formatObjectVars(source, vars) {
  // BUG TODO : Function is using global vars instead of argument
  function recurse(o) {
    var n = Object.keys(o), i;
    for(i = 0; i < n.length; i++)
      if(o[n[i]] && typeof o[n[i]] === 'object')
        recurse(o[n[i]]);
      else if(typeof o[n[i]] === 'string')
        o[n[i]] = formatVars(o[n[i]], false, vars);
  }

  recurse(source);
  return source;
}

/**
  * Format a text to display it into the terminal
  * @param {string} text
  * @param {boolean} [remove] Remove all formatting. Default: false
  */
function format(text, remove) {
  return formatVars(text)
    // Format all colors call 'My text ${red:My second text}'
    .replace(/\${([a-zA-Z0-9#_, ]+?):(.*?)}/g, function(match, style, content) {
      if(remove)
        return content;

      var guib = '', foreground = '', background = '', guibList = ['underline', 'strike', 'overline', 'italic', 'bold', 'glow'];
      style = style.replace(/ /g, '').split(',');

      // If the left content is only composed of a color (which is not marked as foreground or background)
      // And which isn't a style (in guibList)
      // -> That's a simple color, so make it a foreground
      if(style.length === 1 && style[0].indexOf('_') === -1 && guibList.indexOf(style[0]) === -1)
        return '[[;' + (vars['$c_' + style[0]] || style[0]) + ';]' + content + ']';

      for(var i = 0; i < style.length; i += 1) {
        // If the content is a style (underline, strike...)
        if(guibList.indexOf(style[i]) !== -1)
          guib += style[i].substr(0, 1); // guib

        // If the content is marked as a foreground color ('f_red')
        if(style[i].substr(0, 2) === 'f_') {
          foreground = style[i].substr(2);

          // If a color variable exists ('f_red' -> vars['$c_red'])
          if(vars['$c_' + foreground])
            foreground = vars['$c_' + foreground];
        }

        // If the content is marked as a foreground color ('b_red')
        if(style[i].substr(0, 2) === 'b_') {
          background = style[i].substr(2);

          // If a color variable exists ('b_red' -> vars['$c_red'])
          if(vars['$c_' + background])
            background = vars['$c_' + background];
        }
      }

      // Return the content '[[<style>;<foreground>;<background>]<content>]';
      return '[[' + guib + ';' + foreground + ';' + background + ']' + jQuery.terminal.escape_brackets(content) + ']';
    });
}

/**
  * Get a plain date from miliseconds
  * @param {number} ms
  * @return {string}
  */
function formatDate(ms) {
  var d = new Date(ms);
  return d.toString('d') + ' ' + d.toString('t');
}
/*function formatDate(ms) {
  var date    = new Date(ms)                    ,
      day     = (date.getDate()).toString()     ,
      month   = (date.getMonth() + 1).toString(),
      years   = date.getFullYear().toString()   ,
      hours   = date.getHours().toString()      ,
      minutes = date.getMinutes().toString()    ;

  return '0'.repeat(2 - day.length) + day + '/' + '0'.repeat(2 - month.length) + month + '/' + years + ' '
       + '0'.repeat(2 - hours.length) + hours + ':' + '0'.repeat(2 - minutes.length) + minutes;
}*/

var displaying      = false; // Is displaying a message ?
var displayingQueue = [];    // Messages queue
var displayingFinal;
var displayCallback;         // Displaying callback
var displayingIndex;         // Displaying char index
var forceDisplay   = false;  // Display the current line in one time

/**
  * Display a message into the terminal
  * @param {string} message
  * @param {function} humanLike Display like a human and call callback when finished
  */
function display(message, humanLike) {
  message = asPlain(message);
  var split = message.split(/\r|\n|\r\n/);

  // If the message is composed of more than one line, treat it as multiple messages
  // Terminal can't display messages that contains new lines
  if(split.length > 1) {
    // For each message...
    for(var i = 0; i < split.length; i++)
      // Display it as a unique message
      // If that's the last line, use the callback
      display(split[i], humanLike ? (i === split.length - 1 ? humanLike : function(){}) : undefined);

    // Stop the function
    return ;
  }

  // Add the message with its (optionnal) callback to the displaying queue
  displayingQueue.push([message, humanLike]);

  // If no message is currently displayed
  if(!displaying)
    // ... treat the queue
    treatDisplayQueue();
}

/**
  * Display an error into the terminal
  * @param {string} message
  */
function display_error(message) {
  return display('${red:' +  message + '}');
}

/**
  * Treat the displaying queue
  */
function treatDisplayQueue() {
  // If the queue is empty-> report a bug
  if(!displayingQueue.length)
    return report_bug('treatDisplayQueue() has been called but queue is empty');

  // If a message is already displayed-> report a bug
  if(displaying)
    return report_bug('treatDisplayQueue() has been called but a message is already displayed');

  displaying   = true; // Function is displaying a message
  var next     = displayingQueue.splice(0, 1)[0], // That is the current message and its (optionnal) callback
      msg      = next[0], // The message
      callback = next[1]; // Its callback

  // If there is no callback, that's not a human-like display
  // So it have to be displayed in one time
  if(!callback) {
    // Display the text (after variables and color formatting)
    echo(format(msg) || ' ');
    // Function is not displaying a message anymore
    displaying = false;
    // Stop the function
    return ;
  }

  displaying      = rformat(msg); // Message function is displaying
  displayingFinal = msg;          // Message with formatting
  displayCallback = callback;     // Callback (now we know there is a callback)
  displayingIndex = 0;            // The character's position in the string (start at 0)

  // We'll use the prompt to display the text, so we've to make it empty
  term.set_prompt('');
  // Show the cover to make user unable to type some text in the terminal during the display
  //ignoreKeys = true;
  keydownCallback = function(e) {
    if(e.keyCode === 40)
      forceDisplay = true;

    return RESTORE_KEYDOWN_CALLBACK;
  };

  // Treat the string's display
  //setTimeout(treatDisplay, (game.getVar('humanSpeed') || humanSpeed) * 6);
  treatDisplay();
}

/**
  * Treat the current displaying
  */
function treatDisplay() {
  // If there is no message to display-> report a bug
  if(!displaying)
    return report_bug('treatDisplay() has been called but there is no message to display');

  // We'll display another character
  // This condition permit to not increase index if the message is empty
  // ... So that permit to remove some bug
  if(displaying.length)
    displayingIndex++;

  // Check `forceDisplay` request from keydown callback
  if(forceDisplay) {
    forceDisplay = false;
    displayingIndex = displaying.length;
  }

  // If the displaying index is not valid -> report a bug
  if(displayingIndex > displaying.length)
    return report_bug('displayingIndex is higher than displaying length');

  // If we've displayed all the message
  if(displayingIndex === displaying.length) {
    // Display it as an entire string
    echo(format(displayingFinal));
    // ... and make the prompt empty
    term.set_prompt('');
    // We're not displaying a message anymore
    displaying = false;

    //    If there is no more message to display
    // OR if this the next message has no callback (no human-like display)
    // Then we have to recover access to terminal to permit user use it
    if(!queue.length || !queue[0][1]) {
      // Recover the 'normal' prompt
      updatePrompt();
    }

    // Make user able to type some commands in the terminal
    ignoreKeys = false;

    // Remove the keydown callback
    keydownCallback = null;
    // If the display pass key was pressed after the 'forceDisplay' checking
    forceDisplay = false;

    // Call the display callback (because there is one)
    displayCallback();

    // If there is another message to display
    if(displayingQueue.length) {
      // Treat the displaying queue
      treatDisplayQueue();
    }

    // Stop the function
    return ;
  }

  // After this big condition, a little reminder : We have to display the next character of the message
  // So we update the prompt with all chars to the last we can display ('Hello I'm John' 5 -> 'Hello')
  term.set_prompt(displaying.slice(0, displayingIndex));
  // We plan to display the next character in few miliseconds
  setTimeout(treatDisplay, game.getVar('humanSpeed') || humanSpeed);
}

/**
  * Question the user
  * @param {string} message
  * @param {function} callback
  * @param {boolean} [dontSpace] Don't add a space after the message (Default: false)
  */
function question(message, callback, dontSpace) {
  // Update the prompt with the question
  term.set_prompt(format(message || '?') + (dontSpace ? '' : ' '));
  // Make callback catch the input instead of treating it as a command
  catchCommand = function() { ignoreKeys = true; callback.apply(window, arguments); };
  // We don't want prompt to be recovered
  dontRecoverPrompt = true;
  // User must have access to prompt
  ignoreKeys = false;
}

/**
  * Make user making a choice
  * @param {array} choices
  * @param {function} callback
  */
function choice(args, callback) {
  var digits = number_digits(args.length);

  for(var i = 0; i < args.length; i++)
    //display(' [' + (i + 1) + '] ' + args[i]);
    display('${bold:' + (i + 1) + ' '.repeat(digits - number_digits(i + 1)) + ' : }' + args[i]);

  //term.set_prompt('[1-' + args.length + '] ? ');
  display('');
  term.set_prompt(tr('Your choice [1-${end}] ?', [args.length]) + ' ');

  catchCommand = function(ans) {
    if(Number.isNaN(ans = parseInt(ans))) {
      // We don't want prompt to be recovered
      dontRecoverPrompt = true;

      display_error(tr('Answer must be a number'));
      return RESTORE_COMMAND_CALLBACK;
    }

    if(ans < 1 || Math.floor(ans) !== ans || ans > args.length) {
      // We don't want prompt to be recovered
      dontRecoverPrompt = true;

      display_error(tr('Bad answer'));
      return RESTORE_COMMAND_CALLBACK;
    }

    ignoreKeys = true;
    callback(ans, args[ans - 1]);
  };

  // We don't want prompt to be recovered
  dontRecoverPrompt = true;
  // User must have access to prompt
  ignoreKeys = false;
}

/**
  * Ask user for a confirmation
  * @param {string} message
  * @param {function} Callback
  */
function confirm(message, callback) {
  var confirm_keys = tr('y-n'), yes_key = confirm_keys.substr(0, 1).toLocaleLowerCase(), no_key = confirm_keys.substr(2, 1).toLocaleLowerCase();

  term.set_prompt(message + ' [' + confirm_keys + '] ');
  catchCommand = function(ans) {
    ans = ans.toLocaleLowerCase();

    if(ans !== yes_key && ans !== no_key) {
      // We don't want prompt to be recovered
      dontRecoverPrompt = true;

      display_error(tr('Please type `${yes_key}` or `${no_key}`', [yes_key, no_key]));
      return RESTORE_COMMAND_CALLBACK;
    }

    ignoreKeys = true;
    callback(ans === yes_key);
  };

  // We don't want prompt to be recovered
  dontRecoverPrompt = true;
  // User must have access to prompt
  ignoreKeys = false;
}

/**
  * Pause while a key is pressed
  * @param {function} callback
  */
function keyPause(callback) {
  term.set_prompt('');
  dontRecoverPrompt   = true    ;
  ignoreKeys          = false   ;
  keydownCallback     = function() {
    dontRecoverPrompt = false;
    callback();
  };
}

/**
  * Espace string's formatting
  * @param {string} str
  * @return {string}
  */
function fescape(str) {
  return str
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;')
}

/**
  * Escape string's regex chars
  * @param {string} str
  * @return {string}
  */
function rescape(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/**
  * Remove all formatting
  * @param {string} str
  * @return {string}
  */
function rformat(str) {
  return formatVars(str.replace(/\${(.*?):(.*?)}/g, '$2'));
}

/**
  * Escape HTML chars from a string
  * @param {string} str
  * @return {string}
  */
function escapeHtml(str) {
  return $(document.createElement('span')).text(str).html();
}

/**
  * Reverse a string
  * @param {string} input
  * @return {string}
  */
function reverse(input) {
  for(var output = [], i = 0; i < input.length; i++)
      output.push(input[i]);

  return output.reverse().join('');
}

/**
  * Uppercase the first char of a string
  * @param {string} str
  * @return {string}
  */
function ucfirst(str) {
  return str.substr(0, 1).toLocaleUpperCase() + str.substr(1);
}

/**
  * Lowercase the first char of a string
  * @param {string} str
  * @return {string}
  */
function lcfirst(str) {
  return str.substr(0, 1).toLocaleLowerCase() + str.substr(1);
}

/**
  * Get number of digits of a number (ex: 128 -> 3; 45 -> 2; 1475 -> 4)
  * @param {number} n
  * @return {number}
  */
function number_digits(n) {
  return Math.floor(Math.log10(!n ? 1 : n)) + 1;
}

/**
  * Replace all nonbreaking spaces by standard spaces in a string
  * @param {string} str
  * @return {string}
  */
function noBreakingSpace(str) {
  return str.replace(/\xa0/g, ' ');
}

/**
  * Characters table
  * @type {Object}
  */
var chars = {
  3:   'cancel',
  8:   'backspace',
  9:   'tab',
  12:  'clear',
  13:  'enter',
  16:  'shift',
  17:  'ctrl',
  18:  'alt',
  19:  'pause',
  20:  'capslock',
  27:  'esc',
  32:  'space',
  33:  'pageup',
  34:  'pagedown',
  35:  'end',
  36:  'home',
  37:  'left',
  38:  'up',
  39:  'right',
  40:  'down',
  41:  'select',
  42:  'printscreen',
  43:  'execute',
  44:  'snapshot',
  45:  'insert',
  46:  'delete',
  47:  'help',
  145: 'scroll',

  // function keys
  112: 'f1',
  113: 'f2',
  114: 'f3',
  115: 'f4',
  116: 'f5',
  117: 'f6',
  118: 'f7',
  119: 'f8',
  120: 'f9',
  121: 'f10',
  122: 'f11',
  123: 'f12'
};

var keys = {};

for(var _i in chars)
  keys[chars[_i]] = parseInt(_i);
