
var Test = require('segmentio-integration-tester');
var facade = require('segmentio-facade');
var mapper = require('../lib/mapper');
var assert = require('assert');
var Identify = facade.Identify;
var Track = facade.Track;
var Drip = require('..');
var redis = require('redis');

describe('Drip', function() {
  var settings;
  var payload;
  var test;
  var drip;
  var db;

  before(function(done) {
    db = redis.createClient();
    db.on('ready', done);
    db.on('error', done);
  });

  beforeEach(function() {
    settings = {
      account: 8838307,
      token: 'bmrdc6hczyn8yss8o8ta'
    };

    drip = new Drip(settings);
    test = Test(drip, __dirname);
    test.mapper(mapper);
    drip.redis(db);

    var headers = {
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '5000'
      };

      drip.setLimit(headers, function(){});
  });

  it('should have the correct settings', function(){
    test
      .name('Drip')
      .endpoint('https://api.getdrip.com/v2/')
      .ensure('settings.account')
      .ensure('settings.token')
      .ensure('message.email')
      .channels(['server']);
  });

  describe('.validate()', function(){
    var msg;

    beforeEach(function(){
      msg = {
        type: 'identify',
        traits: {
          email: 'jd@example.com'
        }
      };
    });

    it('should be valid when token + account are given', function(){
      test.valid(msg, settings);
    });

    it('should be invalid when token / account are missing', function(){
      test.invalid(msg, { account: 123 });
      test.invalid(msg, { token: 123 });
    });
  });

  describe('mapper', function(){
    describe('identify', function(){
      it('should map basic message', function(){
        test.maps('identify-basic');
      });

      it('should map message with tags', function(){
        test.maps('identify-tags');
      });
    });

    describe('track', function(){
      it('should map basic message', function(){
        test.maps('track-basic');
      });
    });
  });

  describe('.identify()', function(){
    it('should identify user successfully', function(done){
      var msg = test.fixture('identify-basic');

      test
        .set(settings)
        .identify(msg.input)
        .sends({ subscribers: [msg.output] })
        .end(done);
    });

    it('should error with BadRequest on wrong creds', function(done){
      test
        .set({ account: 1, token: 'x' })
        .identify(test.fixture('identify-basic').input)
        .error('bad request status=401 msg=Authentication failed, check your credentials', done);
    });

    it('should retry - no remaining', function(done) {
      var headers = {
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '0'
      };

      drip.setLimit(headers, function(){
        var msg = test.fixture('identify-basic');

        test.set(settings)
            .identify(msg.input)
            .error('too many requests', done)
      });
    });
  });


  describe('.track()', function(){
    it('should track successfully', function(done){
      var msg = test.fixture('track-basic');

      test
        .set(settings)
        .track(msg.input)
        .sends({ events: [msg.output] })
        .end(done);
    });

    it('should send revenue properly in cents', function(done){
      var msg = test.fixture('track-revenue');

      test
        .set(settings)
        .track(msg.input)
        .sends({ events: [msg.output] })
        .end(done);
    });

    it('should convert spaces to underscores for track properties', function(done) {
      var msg = test.fixture('track-spaces');

      test
        .set(settings)
        .track(msg.input)
        .sends({ events: [msg.output] })
        .end(done);
    });
  });
});
