
/**
 * Module dependencies.
 */

var integration = require('segmentio-integration');
var mapper = require('./mapper');
var fmt = require('util').format;
var find = require('obj-case');

/**
 * Expose `Drip`
 */

var Drip = module.exports = integration('Drip')
  .endpoint('https://api.getdrip.com/v2/')
  .ensure('settings.account')
  .ensure('settings.token')
  .ensure('message.email')
  .ensure(function(_, settings) {
    var projects = [
      'QsBFMv5VT8',
      'vqd4s1B4dR',
      'QKsV14k9Au',
      'fyKnQHJgmR',
      'U5ISWY97iv',
      '8HNVCx961K',
      'N28ghIbcxu',
      'VJoItsvt8u',
      'OMXAf05X0Z',
      'PtTnJLXNYZ'
    ];

    if (list.indexOf(settings.projectId) !== -1) {
      return this.invalid('Drip has been disabled for this projectId. Please contact support.');
    }
  })
  .channels(['server'])
  .retries(2);

/**
 * Identify.
 *
 * https://www.getdrip.com/docs/rest-api#subscribers
 *
 * @param {Identify} identify
 * @param {Function} fn
 * @api public
 */

Drip.prototype.identify = function(identify, fn){
  var settings = this.settings;
  var account = settings.account;
  var url = fmt('%s/subscribers', account);
  var subscriber = mapper.identify(identify);
  var self = this;

  this
    .post(url)
    .auth(settings.token)
    .type('json')
    .send({ subscribers: [subscriber] })
    .end(function(err, res){
      if (err && err.timeout) return fn(err);
      if (res.ok) return fn(null, res);
      var errors = res.body.errors || [{}];
      var msg = errors[0].message;
      var status = res.status;
      if ('Email is already subscribed' == msg) return fn(null, res);
      fn(self.error('bad request status=%s msg=%s', status, msg || ''));
    });
};

/**
 * Track.
 *
 * https://www.getdrip.com/docs/rest-api#events
 *
 * @param {Track} track
 * @param {Function} fn
 * @api public
 */

Drip.prototype.track = function(track, fn){
  var account = this.settings.account;
  var url = fmt('%s/events', account);
  var event = mapper.track(track);

  this
    .post(url)
    .auth(this.settings.token)
    .type('json')
    .send({ events: [event] })
    .end(this.handle(fn));
};


/**
 * Normalize the given `obj` keys.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

Drip.prototype.normalize = function(obj){
  var keys = Object.keys(obj);
  var ret = {};

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i].trim().replace(/[^a-z0-9_]/gi, '_');
    ret[key] = obj[keys[i]];
  }

  return ret;
}
