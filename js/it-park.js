'use strict';

var iplinks = {};

/**
  * IT Park model
  * @param {object} files
  */
function DeployPark(files) {

  var schema = JSON.parse(files['it-park.json']),
      names  = Object.keys(schema.employees), vars, _server, data, ip, d, sys, t, centralIP;

  schema.employees['central'] = {
    ssh      : false,
    hypernet : 16384,
    password : model.randomPassword(),
    //recovery : true, -> useless
    outside  : Infinity,
    inside   : Infinity
  };

  names.unshift('central');

  // There is one server per employee
  // TODO: Consider employees internal email account

  for(var i = 0, user; i < names.length; i++) {
    d = Date.now();
    // Generate some (random) variables
    vars = {user: names[i], random: (model.generateId() + model.generateId()).replace(/\-/g, '')};
    // Create an anonymous server
    if(!save.groups || !(data = save.groups[schema.group + '.' + names[i]])) {
      // We don't put an 'alias' field because this function will make the alias
      t     = formatObjectVars(schema.employees[names[i]], vars);
      sys   = {users: {}, ssh: (t !== false), networks: {}};

      if(t.hypernet) sys.networks.hypernet = {speed: t.hypernet};
      sys.networks[schema.group] = {speed: 8192};
      /*if(t.recovery)*/ sys.users['recovery'] = {password: model.randomPassword(), token: TOKENS['system'], home: '/', level: 'system'};
      sys.users[names[i]] = {password: t.password, token: {catch: [], include: ['/users/' + names[i]], includeRead: ['/users/' + names[i]]}, home: '/users/' + names[i], level: 'guest'};
      sys.users['admin']  = {password: model.randomPassword(), token: TOKENS['admin'], home: '/users/admin', level: 'admin'}
      sys.hacksecure = {inside: t.inside || 0, outside: t.outside || 0};

      _server = new Server(ip = model.generateIP(), schema.group + '.' + names[i]);

      if(typeof files[names[i]] === 'object')
        _server.import(files[names[i]], 'files');

      _server.mkdir('/.sys');
      /*_server.mkdir('/apps');
      _server.mkdir('/users');
      _server.mkdir('/users/' + names[i]);
      _server.mkdir('/users/' + names[i] + '/documents');
      _server.mkdir('/users/' + names[i] + '/downloads');*/

      _server.writeFile('/.sys/server.sys', sys);
      _server.install(true);

      if(!t.noVampp)
        _server.touchFile('/apps/vampp');

      _server.hide('/.sys');
      _server.hide('/apps');
    } else {
      _server = new Server(data.IP, schema.group + '.' + names[i]);
      _server.import(data.server);
      ip      = data.IP;
    }

    // First server, 'central'
    if(i === 0)
      iplinks[centralIP = ip] = [];
    else
      iplinks[centralIP].push(ip);

    groups.push(ip);
    _server.update();
    bootServer(_server);
    console.log('Deployed : ' + schema.group + '.' + names[i] + ' (' + (Date.now() - d) + ' ms)');
  }
};
