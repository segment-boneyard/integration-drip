
/**
 * Map identify `msg`.
 *
 * @param {Facade} msg
 * @param {Object} settings
 * @return {Object}
 */

exports.identify = function(msg){
  var ret = {}
  ret.email = msg.email()
  if (msg.traits()["tags"]) ret.tags = msg.traits()["tags"];
  ret.custom_fields = normalize(msg.traits());
  return ret
};

/**
 * Map track `msg`.
 *
 * @param {Facade} msg
 * @param {Object} settings
 * @return {Object}
 */

exports.track = function(msg){
  var ret = {};
  ret.properties = {};
  if (msg.revenue()) ret.properties.value = Math.round(msg.revenue() * 100);
  ret.action = msg.event();
  ret.email = msg.email();
  return ret;
};

/**
 * Normalize keys.
 *
 *    { 'some trait': true } => { some_trait: true }
 *
 * @param {Object} obj
 * @return {Object}
 */

function normalize(obj){
  var keys = Object.keys(obj);
  return keys.reduce(function(ret, k){
    var key = k.trim().replace(/[^a-z0-9_]/gi, '_');
    if (key != "email" && key != "tags") ret[key] = obj[k];
    return ret;
  }, {});
};
