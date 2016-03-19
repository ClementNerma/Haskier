
/**
  * Get localStorage size
  * @param {boolean} [clear] If set to true, will clear the storage before testing (default: false)
  * @return {boolean|Object}
  */
function localStorageStats(clear) {
  if(!hasLocalStorage || !localStorageWorking)
    return false;

  var started = Date.now(), free = localStorageFree(clear), lkeys = Object.keys(localStorage), taken = 0;

  for(var i = 0; i < lkeys.length; i++)
    taken += localStorage.getItem(lkeys[i]).length;

  var time = Date.now() - started, round = free, total = taken + free;

  if((Math.round(round) / 1024 / 1024) - (round / 1024 / 1024) <= 0.001)
    round = Math.round(round / 1024 / 1024) * 1024 * 1024;
  else if((Math.round(round) / 1024) - (round / 1024) <= 0.001)
    round = Math.round(round / 1024) * 1024;

  var ret = {
    total: total,
    free : free ,
    round: round,
    taken: taken
  }, keys = Object.keys(ret), regex = /^([0-9]+)\.([0-9]+)$/, callback = function(match, int, float) { return int + '.' + float.substr(0, 2); };
  ret.approx = {}; ret.time = time;

  for(var i = 0; i < keys.length; i++) {
    if(ret[keys[i]] >= 1024 * 1024)
      ret.approx[keys[i]] = (ret[keys[i]] / 1024 / 1024).toString().replace(regex, callback) + ' Mb';
    else if(ret[keys[i]] >= 1024)
      ret.approx[keys[i]] = (ret[keys[i]] / 1024).toString().replace(regex, callback) + ' Kb';
    else
      ret.approx[keys[i]] = ret[keys[i]].toString().replace(regex, callback) + ' b';
  }

  return ret;
}

/**
  * Get the localStorage free space
  * @param {boolean} [clear] If set to true, will clear the storage before testing (default: false)
  * @return {number|boolean}
  */
function localStorageFree(clear) {
  if(clear)
    localStorage.clear();

  var chain = '1234567890'.repeat(512 * 1024), free = 0, i = 0;

  while(chain.length > 1) {
    try { i++; localStorage.setItem('_' + i, chain); free += chain.length; }
    catch(e) { chain = chain.substr(0, chain.length / 2); }
  }

  for(var j = 0; j < i; j++)
    localStorage.removeItem('_' + j);

  return free;
}

var hasLocalStorage = (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function' && typeof localStorage.getItem === 'function' && typeof localStorage.removeItem === 'function');
var localStorageWorking = false;

try { localStorage.setItem('_____', 'true'); localStorage.removeItem('_____'); localStorageWorking = true; }
catch(e) { }
