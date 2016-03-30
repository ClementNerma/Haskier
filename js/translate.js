'use strict';

var language = navigator.language || 'en';

var tr_pkg = (function() {
  var target = language, pkg;

  if(!target)
    return {};

  var req = $.ajax({
    url  : 'com/translations/' + target + '.json',
    cache: false,
    async: false
  });

  if(req.status !== 200) {
    error('Failed to load translation package `' + target + '`', req);
    return {};
  }

  try      { pkg = JSON.parse(req.responseText); }
  catch(e) { error('Failed to parse translation package `' + target + '`', e); return {}; }

  if(pkg.$_date) {
    var date = pkg.$_date.replace(/[^a-zA-Z\-]/g, '');

    var req = $.ajax({
      url  : 'js/lib/date/date-' + date + '.js',
      cache: false,
      async: false
    });

    if(req.status !== 200) {
      error('Failed to load date localization `' + date + '`', req);
      return {};
    }

    window.eval(req.responseText);
  }

  return pkg;

})();

/**
  * Translate text
  * @param {string} message
  * @param {array|object} [values]
  */
function tr(message, values) {
  var i  = -1/*, reported = false*/;
  values = values || {};

  return (tr_pkg.hasOwnProperty(message) ? tr_pkg[message] : message).replace(/\${([a-zA-Z0-9_]+)}/g, function(match, val) {
    if(!Array.isArray(values)) {
      if(values.hasOwnProperty(val))
        return values[val];
    } else if(values.length > ++i)
      return values[i];

    /*if(!reported) {
      reported = true;
      report_bug('A translation has been required but a value is missing', {message: message, values: values, missing: val});
    }*/

    return /*''*/match;
  })
}
