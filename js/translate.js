'use strict';

var tr_pkg = (function() {
  var target = navigator.language, pkg;

  if(!target)
    return {};

  var req = $.ajax({
    url  : 'com/get-translation.run?lang=' + target,
    cache: false,
    async: false
  });

  if(req.status !== 200) {
    error('Failed to load translation package `' + target + '`', req);
    return {};
  }

  try      { pkg = JSON.parse(req.responseText); }
  catch(e) { error('Failed to parse translation package `' + target + '`', e); return {}; }

  return pkg;

})();

/**
  * Translate text
  * @param {string} message
  * @param {array|object} [values]
  */
function tr(message, values) {
  var i  = -1, reported = false;
  values = values || {};

  return (tr_pkg.hasOwnProperty(message) ? tr_pkg[message] : message).replace(/\${([a-zA-Z0-9_]+)}/g, function(match, val) {
    if(!Array.isArray(values)) {
      if(values.hasOwnProperty(val))
        return values[val];
    } else if(values.length > ++i)
      return values[i];

    if(!reported) {
      reported = true;
      report_bug('A translation has been required but a value is missing', {message: message, values: values, missing: val});
    }

    return '';
  })
}
