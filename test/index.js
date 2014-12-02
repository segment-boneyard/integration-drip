
var Test = require('segmentio-integration-tester');
var helpers = require('./helpers');
var facade = require('segmentio-facade');
var mapper = require('../lib/mapper');
var assert = require('assert');
var Identify = facade.Identify;
var Track = facade.Track;
var Drip = require('..');

describe('Drip', function(){
  var settings;
  var payload;
  var test;
  var drip;

  beforeEach(function(){
    settings = {
      account: 8838307,
      campaignId: 2735752,
      token: 'bmrdc6hczyn8yss8o8ta'
    };
    drip = new Drip(settings);
    test = Test(drip, __dirname);
    test.mapper(mapper);
    payload = {};
  });

  it('should have the correct settings', function(){
    test
      .name('Drip')
      .endpoint('https://api.getdrip.com/v1')
      .ensure('settings.campaignId', { methods: ['identify'] })
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

    it('should be invalid when the msg is identify and campaignId is missing', function(){
      delete settings.campaignId;
      test.invalid(msg, settings);
    });

    it('should be valid when the msg isnt identify and campaignId is missing', function(){
      msg.type = 'track';
      delete settings.campaignId;
      test.invalid(msg, settings);
    });
  });

  describe('mapper', function(){
    describe('identify', function(){
      it('should map basic message', function(){
        test.maps('identify-basic');
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
      var msg = helpers.identify({ traits: { email: 'amir@segment.io' } });

      payload.email = msg.email();
      payload.utc_offset = 0;
      payload.double_optin = false;
      payload.starting_email_index = 0;
      payload.custom_fields = drip.normalize(msg.traits());
      payload.reactivate_if_unsubscribed = false;

      test
        .set(settings)
        .identify(msg)
        .sends({ subscribers: [payload] })
        .end(done);
    });

    it('should identify again', function(done){
      var msg = helpers.identify({ traits: { email: 'amir@segment.io' } });
      drip.identify(msg, done);
    });

    it('should error with BadRequest on wrong creds', function(done){
      test
        .set({ account: 1, token: 'x' })
        .identify(helpers.identify())
        .error('Drip: bad request status=401 msg=', done);
    });
  });

  describe('.campaignId()', function(){
    it('should return campaignId from the message first', function(){
      var msg = helpers.track({ options: { Drip: { campaignId: '123' } }});
      assert('123' == drip.campaignId(msg));
    });

    it('should return campaignId from settings if not in message', function(){
      var msg = helpers.track();
      assert('2735752' == drip.campaignId(msg));
    });
  });

  describe('.track()', function(){
    it('should track successfully', function(done){
      var msg = helpers.track({ properties: { email: 'amir@segment.io' }, options: { Drip: { campaignId: '2735752' } }});
      drip.track(msg, done);
    });
  });
});
