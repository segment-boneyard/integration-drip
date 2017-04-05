/**
 * Module Dependencies
 */

var each = require('@ndhoule/each');

/**
 * Map identify `msg`.
 *
 * @param {Facade} msg
 * @param {Object} settings
 * @return {Object}
 */

exports.identify = function(msg){
  var ret = {}
  ret.email = msg.email();
  ret.user_id = msg.userId();
  var topLevelAttributes = [
    "email",
    "tags",
    "new_email",
    "ip_address",
    "time_zone",
    "potential_lead",
    "prospect"
  ];

  ret.custom_fields = normalize(msg.traits());

  for (var i = 0; i < topLevelAttributes.length; i++){
    var attribute = topLevelAttributes[i]
    if (msg.traits()[attribute]) ret[attribute] = msg.traits()[attribute];
    delete ret.custom_fields[attribute];
  }

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
  var ret = {
    properties: {}
  };

  each(function(value, key) {
    var formattedKey = key.replace(' ', '_');
    ret.properties[formattedKey] = value;
  }, msg.properties());

  if (msg.revenue()) ret.properties.value = Math.round(msg.revenue() * 100);
  ret.action = msg.event();
  ret.email = msg.email();
  delete ret.properties["email"]
  delete ret.properties["revenue"]
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
