
// Newspaper sending
every('minutes', function() {
  var path    = '/webroot/accounts/shaun.frena.account',
      account = servers['65.32.48.22'].readJSON(path);

  account.messages.push({
    id     : (server.generateId()+server.generateId()).replace(/\-/g, ''),
    sender : 'news@paper.com',
    subject: 'Actualités',
    time   : clock.getTime(),
    content: '--- Système de jeu en cours de création.\n--- Vous pouvez ignorer cet e-mail.'
  });

  servers['65.32.48.22'].writeFile(path, account);
});
