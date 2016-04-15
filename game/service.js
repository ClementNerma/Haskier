
// Scope adaptation
scope.download = function(ip, file) {
  // Dependency !!! Try to remove it !
  aliases.hypernet.writeFile('/webroot/______.xms', servers[ip].readFile(file));
  exec('icefox master.net/______ -d ______', function() {
    display('\nFichier : ${f_cyan,italic:' + file.split('/')[file.split('/').length - 1] + '}\n\n=================================\n${italic:' + /*fescape(*/server.readFile('______')/*)*/.split('\n').join('}\n${italic:') + '}\n=================================\n');
    aliases.hypernet.removeFile('/webroot/______');
    server.removeFile('______');
    go();
  });
};

// Newspaper sending
every('days', function() {
  var path    = '/webroot/accounts/shaun.frena.account',
      account = aliases.mailbox.readJSON(path);

  account.messages.push({
    id     : (server.generateId()+server.generateId()).replace(/\-/g, ''),
    box    : 'inbox',
    sender : 'news@paper.com',
    subject: 'Actualités',
    time   : clock.getTime(),
    content: '--- Système de jeu en cours de création.\n--- Vous pouvez ignorer cet e-mail.'
  });

  aliases.mailbox.writeFile(path, account);
});

// Game Scope (GS)
gs = {};

// GS : Mission 01
gs[01] = {
  checkLogErased: function() {
    time_in({hours: 3}, function() {
      if(aliases['anonymas.das'].fileExists('/users/das-ssh/hax.log')) {
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
