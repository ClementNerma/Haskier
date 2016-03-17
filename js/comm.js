'use strict';

/**
  * Report a bug
  * @param {string} error
  * @param {object} vars
  */
function report_bug(error, vars) {
  vars = JSON.stringify(vars || {}, null, 4);

  if(confirm(tr('A bug has been detected. Would you like to report it ?\n\nDetails :\n${err}\n\n${vars}', [error, vars])))
    $.ajax({
      url   : 'com/bug-report.run',
      method: 'GET',
      data  : {
        message: (new Error(error)).stack + ' || ' + vars,
        time   : (new Date()).getTime()
      },
      success: function() {
        console.log('A bug was reported just now.');
        alert(tr('Bug has been reported. Thank you !'));
      },
      error: function(req) {
        console.error('Failed to report bug to server\n' + req.responseText);
        alert(tr('Failed to report bug to server ;('));
      }
    });
}

/**
  * Display an error
  * @param {string} message
  * @param {object} [supp]
  */
function error(message, supp) {
  console.error(message);
  if(supp) console.error(supp);

  $('#infos').text(message).css('color', 'red');
}

/**
  * Display an information
  * @param {string} message
  */
function info(message) {
  $('#infos').text(message);
}

/**
  * Format a text to display it into the terminal
  * @param {string} text
  */
function format(text) {
  return text
    .replace(/\${([a-zA-Z0-9_]+)}/g, function(match, val) {
      return vars.hasOwnProperty(val) ? vars[val] : match;
    })
    .replace(/\${([a-zA-Z0-9#_, ]+?):(.*?)}/g, function(match, style, content) {
      var guib = '', foreground = '', background = '', guibList = ['underline', 'strike', 'overline', 'italic', 'bold', 'glow'];
      style = style.replace(/ /g, '').split(',');

      if(style.length === 1 && style[0].indexOf('_') === -1 && guibList.indexOf(style[0]) === -1)
        return '[[;' + (vars['$c_' + style[0]] || style[0]) + ';]' + content + ']';

      for(var i = 0; i < style.length; i += 1) {
        if(guibList.indexOf(style[i]) !== -1)
          guib += style[i].substr(0, 1); // guib

        if(style[i].substr(0, 2) === 'f_') {
          foreground = style[i].substr(2);

          if(vars['$c_' + foreground])
            foreground = vars['$c_' + foreground];
        }

        if(style[i].substr(0, 2) === 'b_') {
          background = style[i].substr(2);

          if(vars['$c_' + background])
            background = vars['$c_' + background];
        }
      }

      return '[[' + guib + ';' + foreground + ';' + background + ']' + content + ']';
    });
}

/**
  * Display a message into the terminal
  * @param {string} message
  */
function display(message) {
  term.echo(format(message));
}
