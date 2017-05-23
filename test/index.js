
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

    db.flushall();
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

    it('should error with Unauthorized on wrong creds', function(done){
      test
        .set({ account: 1, token: 'x' })
        .identify(test.fixture('identify-basic').input)
        .error('Unauthorized', done);
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

  describe('.setLimit()', function() {
    it('should set limit succefully', function(done) {
      var appId = '140286';
      var key = ['drip', appId].join(':');
      drip.settings.account = appId;

      var remaining = Math.floor((Math.random() * 1000) + 1);
      var headers = {'x-ratelimit-remaining': remaining};

      drip.setLimit(headers, function() {
        db.get(key, function(err, res) {
          assert.deepEqual(err, null);

          limit = JSON.parse(res);
          assert.deepEqual(limit.remaining, remaining);
          done();
        });
      });
    });
  });

  describe('.limit()', function() {
    it('req is called when there is no limit in redis', function(done) {
      var appId = '300888';
      drip.settings.account = appId;
      drip.limit(done, done);
    });

    it('req is called when there is remaining', function(done) {
      var appId = '201187';
      drip.settings.account = appId;

      var remaining = 42;
      var headers = {'x-ratelimit-remaining': remaining};

      drip.setLimit(headers, function() {
        drip.limit(done, done);
      });
    });

    it('req is called when reset is passed', function(done) {
      var appId = '201187';
      drip.settings.account = appId;

      var remaining = 0;
      var headers = {
        'x-ratelimit-remaining': remaining,
        'x-ratelimit-reset': Date.now() - 1000
      };

      drip.setLimit(headers, function() {
        drip.limit(done, done);
      });
    });

    it('req is not called when remaining is 0 and reset is not passed',
       function(done) {
         var appId = '201187';
         drip.settings.account = appId;

         var remaining = 0;
         var headers = {'x-ratelimit-remaining': remaining};

         drip.setLimit(headers, function() {
           var req = function() {
             err = new Error('should not be called');
             done(err);
           };

           var fn = function() {
             done();
           };

           drip.limit(req, fn);
         });
       });
  });
});
