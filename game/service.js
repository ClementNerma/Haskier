
// Newspaper sending
every('days', function() {
  var path    = '/webroot/accounts/shaun.frena.account',
      account = servers['65.32.48.22'].readJSON(path);

  account.messages.push({
    id     : (server.generateId()+server.generateId()).replace(/\-/g, ''),
    box    : 'inbox',
    sender : 'news@paper.com',
    subject: 'Actualités',
    time   : clock.getTime(),
    content: '--- Système de jeu en cours de création.\n--- Vous pouvez ignorer cet e-mail.'
  });

  servers['65.32.48.22'].writeFile(path, account);
});

// Game Scope (GS)
gs = {};

// GS : Mission 01
gs[01] = {
  checkLogErased: function() {
    time_in({minutes: 1}, function() {
      if(servers['148.25.136.98'].fileExists('/users/das-ssh/hax.log')) {
        commands.__gameOver = {arguments:[],async:true,callback:function() {
          display('L\'administrateur a vérifié les logs du serveur.');
          display('Vous avez été identifié. La police vient chez vous pour vous arrêter.');
          scope.gameOver();
        }};

        command_now('__gameOver');
      }
    });

    go();
  }
};
