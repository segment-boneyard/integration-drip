
/**
 * Map identify `msg`.
 *
 * @param {Facade} msg
 * @param {Object} settings
 * @return {Object}
 */

exports.identify = function(msg){
  var traits = normalize(msg.traits());

  return {
    reactivate_if_unsubscribed: false,
    starting_email_index: 0,
    custom_fields: traits,
    email: msg.email(),
    utc_offset: 0,
    double_optin: false,
  };
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
  if (msg.revenue()) ret.value = msg.revenue();
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
    ret[key] = obj[k];
    return ret;
  }, {});
};
