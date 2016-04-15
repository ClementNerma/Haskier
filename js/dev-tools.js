
/**
  * Error Handler
  * @param {ErrorEvent} err
  */
function dev_ErrorHandler(err) {
  // Do stuff here...
}

/**
  * Open developper's tools
  */
function openDevTools() {
  if(devtools_opened) return ;
  d.show();
  d.scrollTop(d.prop("scrollHeight"));
  d.focus();
}

/**
  * Close developper's tools
  */
function closeDevTools() {
  if(!devtools_opened) return ;
  d.hide();
}

/**
  * Toggle developper's tools
  */
function toggleDevTools() {
  if(devtools_opened) closeDevTools(); else openDevTools();
  devtools_opened = !devtools_opened;
}

/**
  * Run a developper command
  * @param {string} command
  * @return {void|*}
  */
function dev_run(command) {
  var sep  = (command.indexOf(':') < command.indexOf(' ') && command.indexOf(':') !== -1) ? ':' : ' ',
      cmd  = command.split(sep)[0],
      args = command.split(sep).slice(1).join(sep);

  switch(cmd) {
    case 'js':
      d.echo(asPlain(eval(args)));
      break;

    case 'export':
      window.open('', 'DCE - Debugging context export tool').document.write('<pre>' + escapeHtml(
        LZString.decompressFromUTF16(localStorage.getItem('haskier'))
      ) + '</pre>');
      break;

    case 'mark':
      d.echo('<hr/>',{raw:true});
      break;

    case 'reboot' :
    case 'restart':
    case 'reload' :
    case 'refresh':
      window.location.reload();
      break;
  }
}

var d = $('#devtools').terminal(dev_run, {
  greetings: '',
  name     : 'devtools',
  prompt   : '> '
}), devtools_opened = false;

// Error handler
window.addEventListener('error', dev_ErrorHandler);
