'use strict';

let chai = require('chai');
let fs = require('fs');
let expect = chai.expect; // we are using the "expect" style of Chai
let gpioMock = require('./../index');

describe('index', function() {
  before(function() {
    gpioMock.start()
  });

  after(function() {
    gpioMock.stop();
  });

  it('writing to /sys/class/gpio/export using fs.writeFile() should create directories and files in mock directory', function(done) {
    fs.writeFile('/sys/class/gpio/export', '1', function(err, data) {
      expect(err).to.be.null;
      expect(data).to.be.undefined;
      setTimeout(function() {
        fs.stat('./sys/class/gpio/gpio1', function (err, stats) {
          expect(stats.isDirectory()).to.equal(true);
          var dir = fs.openSync('./sys/class/gpio/gpio1/direction', 'r');
          var val = fs.openSync('./sys/class/gpio/gpio1/value', 'r');
          expect(dir).to.exist;
          expect(val).to.exist;
          done();
        });
      }, 750);
    });
  });

  it('writing to /sys/class/gpio/unexport using fs.writeFile() should remove directories and files in mock directory', function(done) {
    fs.writeFile('/sys/class/gpio/unexport', '1', function(err, data) {
      expect(err).to.be.null;
      expect(data).to.be.undefined;
      setTimeout(function() {
        fs.stat('./sys/class/gpio/gpio1', function (err, stats) {
          expect(err).to.exist;
          done();
        });
      }, 750);
    });
  });
});