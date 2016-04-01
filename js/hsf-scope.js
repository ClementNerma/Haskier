'use strict';

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
    question(game.getVar('ALLOW_TRANSLATION') ? tr(msg || '') : (msg || ''), function(answer) {
      // Question callback
      term.set_prompt(''); // Improving prompt
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
      term.set_prompt(''); // Improving prompt
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
      term.set_prompt(''); // Improving prompt
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
      if(!game.goLabel(fastdev && query.label ? query.label : save.label)) {
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
    } else if(fastdev && query.label) {
      if(!game.goLabel(query.label))
        console.error('[DEV] Failed to go to label "' + query.label + '"');

      justRestoredLabel = false;
    }

    // If the save contains the script's diff scope, restore it
    if(save.scope && !dontRestoreScope) {
      var keys = Object.keys(save.scope);

      for(var i = 0; i < keys.length; i++)
        scope[keys[i]] = save.scope[keys[i]];
    }

    go();
  },

  todoModels: {},

  setTodoModel: function(name, model) {
    scope.todoModels[name] = model;
    go();
  },

  setInitialClock: function(_clock) {
    if(!save.clock)
      clock = _clock;

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

    if(fastdev && query.exec) {
      command(query.exec);
      query.exec = null;
    }
  },

  goto: function(label) {
    if(!game.goLabel(label))
      report_bug('Scenaristic file tried to go to label "' + label + '", but operation has failed');

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

  sleep: function(time) {
    if(typeof time === 'string') {
      display(time);
      keydownCallback = go;
    } else {
      ignoreKeys = true;
      setTimeout(function() {
        ignoreKeys = false;
        go();
      }, fastMode ? 0 : time);
    }
  },

  localStorageStats: function() {
    scope.answer = localStorageStats();
    go();
  },

  gameWon: function() {
    display('\n${cyan,italic:Vous avez terminé le jeu. Félicitations !}\n${cyan,italic:Notez que ceci était une version Alpha du jeu et que le scénario n\'est, à ce titre, pas terminé.}\n${cyan,italic:Je vous remercie d\'avoir joué à ce jeu. N\'hésitez pas à le commenter sur mon compte twitter (@ClementNerma) afin que je puisse l\'améliorer. Merci !}');
  },

  gameOver: function() {
    vars.gameOver = true;

    if(outputFilter) {
      report_bug('There is an output filter during the GO function');
      outputFilter = false;
    }

    var gostr = 'gameover'

    term.set_prompt('X) > ');

    display('');
    display(tr('${f_red,bold:You failed.} ${f_red,bold,italic:Game Over}.\nType "${red,bold${str}}" to recognize your defeat. Goodbye, ${italic,bold:${name}} !', {str: gostr}));

    queue           = []  ;
    catchCommand    = function(cmd) {
      if(cmd !== gostr) {
        display(tr('I told you to type ${f_red,bold:${str}}', {str: gostr}));
        return true;
      }

      term.pause();
      display('${bold:Goodbye !! X-)}');

      setTimeout(function() {
        localStorage.setItem('haskier_before_gameover', localStorage.getItem('haskier'));
        localStorage.removeItem('haskier');
        window.location.reload();
      }, 2000);
    };
    /*keydownCallback = function(e) {
        var key = e.keyCode;

        if(
          (key > 47  && key <  58 ) || // number keys
          key == 32  || key == 13   || // spacebar & return key(s) (if you want to allow carriage returns)
          (key > 64  && key <  91 ) || // letter keys
          (key > 95  && key <  112) || // numpad keys
          (key > 185 && key <  193) || // ;=,-./` (in order)
          (key > 218 && key <  223)   // [\]' (in order)
        ) {} else return true;

        localStorage.setItem('haskier_before_gameover', localStorage.getItem('haskier'));
        localStorage.removeItem('haskier');
        window.location.reload();
    };*/

  },

  incoming: function(name) {
    game.setVar('human_talking', name);
    scope.display('${grey:' + tr('=== Incoming communication ===') + '}');
  },

  incomingEnd: function() {
    game.delVar('human_talking');
    term.echo(format('${f_grey,italic:' + tr('=== Communication\'s end ===') + '}'));
    server.state('communication-opened', false);
    go();
  },

  download: function(ip, file) {
    // Dependency !!! Try to remove it !
    servers['127.32.47.53'].writeFile('/webroot/______', servers[ip].readFile(file));
    exec('icefox master.net/______ -d ______', function() {
      display('\nFichier : ${f_cyan,italic:' + file.split('/')[file.split('/').length - 1] + '}\n\n=================================\n${italic:' + /*fescape(*/server.readFile('______')/*)*/.split('\n').join('}\n${italic:') + '}\n=================================\n');
      servers['127.32.47.53'].removeFile('/webroot/______');
      server.removeFile('______');
      go();
    });
  },

  taken: function(name, time) {
    display('${italic,f_grey:' + name + ' est occupé}');

    if(time)
      scope.sleep(time);
    else
      go();
  },

  exec: function(cmd) {
    exec(cmd);
  },

  launchClock: function() {
    $('#clock').show();
    clockMove();
    setInterval(clockMove, 1000 * 60 / (game.getVar('CLOCK_SPEED_COEFFICIENT') || 12));
    go();
  },

  wait_clock: function(future) {
    var models = {h: 'Hours', m: 'Minutes', s: 'Seconds', d: 'Days', M: 'Months', y: 'Years', w: 'Weeks'},
        date   = new Date(clock.getTime());

    future.replace(/(^| )(\+|\-)([a-zA-Z]) ([0-9]{1,2})/g, function(match, _, op, model, num) {
      date['add' + models[model]](parseInt(num) * (op === '-' ? -1 : 1));
    });

    scope.todo(date.getTime());

    setTimeout(function() {
      todo = [];
      go();
    } ,(date - clock) / (game.getVar('CLOCK_SPEED_COEFFICIENT') || 12) * (fastdev === false || !query['fast-clock']));
  }
};
