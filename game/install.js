'use strict';

// Configure mailboxses
var srv   = aliases.mailbox; srv.chdir('/webroot/accounts');
var boxes = srv.glob('*.account', ['only_files']), name, model = srv.readJSON('model.box'), account, write;

for(var i = 0; i < boxes.length; i++) {
  name    = boxes[i].vars[0];
  write   = clone(model);

  write.account       = srv.readJSON(boxes[i].path);
  write.account.token = (window.model.generateId() + window.model.generateId()).replace(/\-/g, '');

  srv.writeFile(boxes[i].path, write);
}

srv.removeFile('model.box');
