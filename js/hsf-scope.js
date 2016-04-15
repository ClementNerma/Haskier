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

  question: function(msg, dontSpace) {
    dontRecoverPrompt = true;
    question(game.getVar('ALLOW_TRANSLATION') ? tr(msg || '') : (msg || ''), function(answer) {
      // Question callback
      term.set_prompt(''); // Improving prompt
      game.setVar('answer', answer);
      dontRecoverPrompt = null;
      go();
    }, !!dontSpace);
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
      if(fastdev && query.javascript)
        onQueueFinished = function() { window.eval(query.javascript); };

      simulateShellWrited(query.exec);
      command(query.exec);

      query.exec = null;
    } else if(fastdev && query.javascript)
      window.eval(query.javascript);

    if(onShellReady) {
      simulateShellWrited(onShellReady);
      command(onShellReady);

      onQueueFinished = function() {
        if(fastdev && query.javascript)
          window.eval(query.javascript);

        for(var i = 0; i < todo.length; i++) {
          if(todo[i][0] === 'command' && window.eval(todo[i][1])) {
            todo.splice(i, 1);
            i--;
          }
        }

        if(!todo.length)
          go();
      };
    } else {
      for(var i = 0; i < todo.length; i++) {
        if(todo[i][0] === 'command' && window.eval(todo[i][1])) {
          todo.splice(i, 1);
          i--;
        }
      }

      if(!todo.length)
        go();
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
    todo = ['unreachable'];
    ignoreKeys = true;
  },

  gameOver: function() {
    vars.gameOver = true ;
    ignoreKeys    = false;

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
        return RESTORE_COMMAND_CALLBACK;
      }

      term.pause();
      display('${bold:Goodbye !! X-)}');

      setTimeout(function() {
        localStorage.setItem('haskier_before_gameover', localStorage.getItem('haskier'));
        localStorage.removeItem('haskier');
        window.location.reload();
      }, 2000);
    };
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
  },

  wait_at: function(moment) {
    var time = timeDiff(moment);
    scope.todo(time);

    setTimeout(function() {
      todo = [];
      go();
    }, time / (game.getVar('CLOCK_SPEED_COEFFICIENT') || 12) * (fastdev === false || !query['fast-clock']))
  },

  send_mail: function(adress, sender, subject, content) {
    var s    = aliases.mailbox, o = adress;
    adress   = adress.replace(/@mailbox\.net$/, '');
    var path = '/webroot/accounts/' + adress + '.account';

    if(!s.fileExists(path)) {
      console.warn('HSF script tried to send an email to adress ' + o + ', but adress was not found');
      go();
      return ;
    }

    var f = s.readJSON(path);

    f.messages.push({
      id     : (server.generateId() + server.generateId()).replace(/\-/g, ''),
      sender : sender,
      subject: subject,
      content: content,
      box    : 'inbox',
      time   : clock.getTime()
    });

    s.writeFile(path, f);
    go();
  }
};
