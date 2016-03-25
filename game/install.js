'use strict';

var names = Object.keys(servers), search, apps, _server, j;

for(var i = 0; i < names.length; i++) {
  _server = servers[names[i]];
  search  = _server.glob('apps/*');

  for(j = 0; j < search.length; j++) {
    if(!servers.__store.dirExists('webroot/' + search[j].vars[0]))
      fatal('Application "' + search[j].vars[0] + '" was not found on the store\'s server');

    if(!_server.importFolder(servers.__store.exportFolder('webroot/' + search[j].vars[0]), 'apps/' + search[j].vars[0]))
      fatal('Failed to import application "' + search[j].vars[0] + '" to the server');

    _server.removeFile(search[j].path);
  }
}
