
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

    if (projects.indexOf(settings.projectId) !== -1) {
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

Drip.prototype.identify = function(identify, fn) {
  var settings = this.settings;
  var account = settings.account;
  var url = fmt('%s/subscribers', account);
  var subscriber = mapper.identify(identify);
  var self = this;

  var req = function() {
    self.post(url)
        .auth(settings.token)
        .type('json')
        .send({subscribers: [subscriber]})
        .end(function(err, res) {
          if (err && err.timeout) {
            return fn(err)
          }

          if (res.ok) {
            return self.setLimit(res.headers, function() {
              fn(null, res);
            });
          }

          if (res.status === 429) {
            err = new Error('too many requests')
            err.status = 429;
            return self.setLimit(header, function() {
              fn(err);
            });
          }

          var errors = res.body.errors || [{}];
          var msg = errors[0].message;
          if ('Email is already subscribed' == msg) {
            return fn(null, res);
          }

          fn(err);
        });
  };

  self.limit(req, fn);
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

Drip.prototype.track = function(track, fn) {
  var account = this.settings.account;
  var url = fmt('%s/events', account);
  var event = mapper.track(track);
  var self = this;

  var req = function() {
    self.post(url)
        .auth(self.settings.token)
        .type('json')
        .send({events: [event]})
        .end(function(err, res) {
          if (err && err.timeout) {
            return fn(err)
          }

          if (res.ok) {
            return self.setLimit(res.headers, function() {
              fn(null, res)
            });
          }

          if (res.status === 429) {
            err = new Error('too many requests')
            err.status = 429;
            return self.setLimit(res.headers, function() {
              fn(err);
            });
          }

          fn(err);
        });
  };

  self.limit(req, fn);
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
};

/**
 * Set the partner request limit.
 *
 * @param {Function} headers
 * @param {Function} completion
 * @api private
 */

Drip.prototype.setLimit = function(headers, completion) {
  var appId = this.settings.account;
  var key = ['drip', appId].join(':');
  var redis = this.redis();

  var limit = {
    remaining: headers['x-ratelimit-remaining'],
    reset: headers['x-ratelimit-reset'] || Date.now() + (1000 * 60 * 5)
  };

  redis.set(key, JSON.stringify(limit), function(err, res) {
    completion();
  });
};

/**
 * Limits the integration to send too many request to the partner.
 *
 * @param {Function} fn
 * @param {Function} req
 * @api private
 */

Drip.prototype.limit = function(req, fn) {
  var appId = this.settings.account;
  var key = ['drip', appId].join(':');
  var redis = this.redis();

  redis.get(key, function(err, res) {
    if (!res || err) {
      return req();
    }

    var limit = JSON.parse(res);
    if (limit.remaining > 0) {
      return req();
    }

    var now = Date.now();
    if (now >= limit.reset) {
      return req();
    }

    // var rand = Math.floor((Math.random() * 100) + 1);
    // if (rand <= 3) {
    //   return req();
    // }

    err = new Error('too many requests')
    err.status = 429;
    fn(err);
  });
};
