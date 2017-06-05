'use strict';

let rimraf = require('rimraf');
let chai = require('chai');
let fs = require('fs');
let expect = chai.expect; // we are using the "expect" style of Chai
let gpioMock = require('./../index');

describe('ds18b20', function() {

  afterEach(function() {
    gpioMock.stop();
  });

  it('adding mock hardware should result in callback with no error', function(done) {
    gpioMock.start(function(err) {
      gpioMock.addMockHardwareModule('ds18b20', './ds18b20.js', function(err) {
        expect(err).to.not.exist;
        done();
      });
    });
  });

  it('adding sensor should result in callback with no error', function(done) {
    gpioMock.start(function(err) {
      let sensor = {
        "behavior": "static",
        "temperature": "12"
      };

      gpioMock.addMockHardwareModule('ds18b20', './ds18b20.js', function(err) {
        if (!err) {
          gpioMock.addMockHardware('ds18b20', '1', sensor, function(err) {
            expect(err).to.be.undefined;
            done();
          });
        }
      });
    });
  });

  it('adding sensor when module is not registered should result in callback error', function(done) {
    gpioMock.start(function(err) {
      let sensor = {
        "behavior": "static",
        "temperature": "12"
      };

      gpioMock.addMockHardware('ds18b20', '1', sensor, function(err) {
        expect(err).to.exist;
        done();
      });
    });
  });

  it('adding a sensor twice should result in callback with error', function(done) {
    gpioMock.start(function(err) {
      let sensor = {
        "behavior": "static",
        "temperature": "12"
      };

      gpioMock.addMockHardwareModule('ds18b20', './ds18b20.js', function(err) {
        if (!err) {
          gpioMock.addMockHardware('ds18b20', '1', sensor, function(err) {
            gpioMock.addMockHardware('ds18b20', '1', sensor, function(err) {
              expect(err).to.exist;
              done();
            });
          });
        }
      });
    });
  });

  it('sensors should be able to be added with different behaviors', function(done) {
    gpioMock.start(function(err) {
      gpioMock.addMockHardwareModule('ds18b20', './ds18b20.js', function(err) {
        if (!err) {
          let external = { "behavior": "external", "temperature": "44" };

          gpioMock.addMockHardware('ds18b20', '2', external, function(err) {
            expect(err).to.be.undefined;

            let f = { "behavior": "function", "temperature": function() {return 55000;} };

            gpioMock.addMockHardware('ds18b20', '3', f, function(err) {
              expect(err).to.be.undefined;

              let stat = { "behavior": "static", "temperature": "23" };

              gpioMock.addMockHardware('ds18b20', '4', stat, function(err) {
                expect(err).to.be.undefined;
                done();
              });
            });
          });
        }
      });
    });
  });
});