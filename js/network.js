
/**
  * Network interface
  * @constructor
  * @param {string} data Network plain data
  */
var Network = function(data) {

  var dns = [], split = data.split('\n'), line, match;

  for(var i = 0; i < split.length; i++) {
    line = split[i].trim();

    if(!line) continue ;

    if(match = line.match(/^([^ ]+) +([^ ]+) +([^ ]+)$/))
      // form: (test|advance) 127.0.0.1 $1.xms
      dns.push({regex: new RegExp('^' + match[1] + '$'), IP: match[2], replace: match[3]});
    else if(match = line.match(/^([^ ]+) +([^ ]+)$/))
      // form: (test|advance) 127.0.0.1
      dns.push({regex: new RegExp('^' + match[1] + '$'), IP: match[2], replace: '$0'});
    else
      fatal(tr('Bad network interface'));
  }

  /**
    * Parse an URL
    * @param {string} url
    * @return {object|boolean} Parsed URL, false if failed
    */
  this.parseUrl = function(url) {
    for(var parsed, i = 0; i < dns.length; i++)
      if(dns[i].regex.test(url))
        return {
          IP : dns[i].IP,
          url: url.replace(dns[i].regex, dns[i].replace)
        };

    return false;
  };

};
