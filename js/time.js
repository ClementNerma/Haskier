
/**
  * Calculate a clock from zero values
  * @param {object} moment
  * @return {number} Time, in ms
  */
function makeZeroClock(moment) {
  var d = new Date(0)
    d.setMonth  ((moment.months || -1) + 1);
    d.setDate   ((moment.days   || 0) + 1);
    d.setHours  ((moment.hours  || 0) + 1);
    d.setMinutes(moment.minutes || 0);
    d.setSeconds(moment.seconds || 0);

  return d.getTime();
}

/**
  * Add a clock to game's clock (copy)
  * @param {string} name
  * @param {number} [n] Default: 1
  * @return {number} Time, in ms
  */
function nextTime(name, n) {
  // Example of use :
  //  name = 'hour', n = 1
  // significates "the next hour", not "in one hour"
  // if clock is 18:47, the difference will be 0:13

  var tmp;

  if(typeof moment === 'string') {
    tmp = {};
    tmp[moment + (moment.substr(moment.length - 1, 1) === 's' ? '' : 's')] = 1;
    moment = tmp;
  }

  var cc = new Date(clock.getTime());
  var list = ['months', 'days', 'hours', 'minutes', 'seconds'], passedNot;

  for(var i = 0; i < list.length; i++) {
    if(name + 's' === list[i]) {
      passedNot = true;
      cc['add' + ucfirst(list[i])](n || 1);
    } else if(passedNot)
      cc['set' + ucfirst(list[i])](0);
  }

  return {
    clock: cc.getTime(),
    diff : cc.getTime() - clock.getTime()
  };
}

/**
  * Calculate difference between custom clock and game's clock
  * @param {object} moment
  * @return {number} Time, in ms
  */
function timeDiff(moment) {
  // Example of use :
  // moment = {hours: 20, seconds: 10}
  //  significates "the next hour", not "in one hour"
  // if clock is 18:47:13, clock copy will be 20:00:10

  var cc    = new Date(clock.getTime());
  var list  = ['months', 'days', 'hours', 'minutes', 'seconds'], passedNot;

  for(var i = 0; i < list.length; i++) {
    if(moment[list[i]]) {
      passedNot = true;
      cc['set' + ucfirst(list[i] === 'days' ? 'date' : list[i])](moment[list[i]]);
    } else if(passedNot)
      cc['set' + ucfirst(list[i] === 'days' ? 'date' : list[i])](0);
  }

  return cc.getTime() - clock.getTime();
}

/**
  * Calculate some values around a moment
  * @param {string|object} moment
  * @return {object}
  */
function timeInterval(moment) {
  var tmp;

  if(typeof moment === 'string') {
    tmp = {};
    tmp[moment + (moment.substr(moment.length - 1, 1) === 's' ? '' : 's')] = 1;
    moment = tmp;
  }

  var every = makeZeroClock(moment);
  var cc    = new Date(clock.getTime());

  var list = ['months', 'days', 'hours', 'minutes', 'seconds'], passedNot;

  for(var i = 0; i < list.length; i++) {
    if(moment[list[i]])
      passedNot = true;

    if(moment[list[i]] || passedNot)
      cc[(moment[list[i]] ? 'add' : 'set') + (list[i] === 'days' && !moment[list[i]] ? 'Date' : ucfirst(list[i]))]((moment[list[i]] || 0) + (list[i] === 'months' ? 1 : 0));
  }

  return {
    every: every,     // Moment's clock as an interval, in ms
    diff : cc - clock // Time that separate the two event (timeout before game's clock reaches the moment's clock)
  };
}

/**
  * Run a function from time to time
  * @param {string|object} moment
  * @param {function} callback
  */
function every(moment, callback) {
  var time = timeInterval(moment);

  setTimeout(function() {
    setInterval(callback, time.every / (game.getVar('CLOCK_SPEED_COEFFICIENT') || 12));
    callback();
  }, time.diff / (game.getVar('CLOCK_SPEED_COEFFICIENT') || 12));
}

/**
  * Run a function in a time
  * @param {string|object} moment
  * @param {function} callback
  */
function time_in(moment, callback) {
  var time = timeInterval(moment);
  setTimeout(callback, time.diff / (game.getVar('CLOCK_SPEED_COEFFICIENT') || 12));
}

/**
  * Run a function AT a time
  * @param {object} moment
  * @param {function} callback
  */
function time_at(moment, callback) {
  var time = timeDiff(moment);
  setTimeout(callback, time / (game.getVar('CLOCK_SPEED_COEFFICIENT') || 12));
}
