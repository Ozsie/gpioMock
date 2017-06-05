'use strict';

let rimraf = require('rimraf');
let chai = require('chai');
let fs = require('fs');
let expect = chai.expect; // we are using the "expect" style of Chai
let gpioMock = require('./../index');

describe('index', function() {

  afterEach(function() {
    gpioMock.stop();
  });

  after(function(done) {
    rimraf('./sys', function() {
      rimraf('./mock', function() {
        done();
      });
    });
  });

  it('writing to /sys/class/gpio/export using fs.writeFile() should create directories and files in mock directory', function(done) {
    gpioMock.start(function(err) {
      fs.writeFile('/sys/class/gpio/export', '1', function(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.undefined;
        fs.stat('./sys/class/gpio/gpio1', function (err, stats) {
          expect(stats.isDirectory()).to.equal(true);
          var dir = fs.openSync('./sys/class/gpio/gpio1/direction', 'r');
          var val = fs.openSync('./sys/class/gpio/gpio1/value', 'r');
          expect(dir).to.exist;
          expect(val).to.exist;
          done();
        });
      });
    });
  });

  it('writing to /sys/class/gpio/export using fs.writeFile() when value != number shuld do nothing', function(done) {
    gpioMock.start(function(err) {
      fs.writeFile('/sys/class/gpio/export', 'foo', function(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.undefined;
        fs.stat('./sys/class/gpio/gpiofoo', function (err, stats) {
          expect(err).to.exist;
          expect(stats).to.be.undefined;
          done();
        });
      });
    });
  });

  it('writing to /sys/class/gpio/unexport using fs.writeFile() should remove directories and files in mock directory', function(done) {
    gpioMock.start(function(err) {
      fs.writeFile('/sys/class/gpio/unexport', '1', function(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.undefined;
        setTimeout(function() {
          fs.stat('./sys/class/gpio/gpio1', function (err, stats) {
            expect(err).to.exist;
            done();
          });
        }, 100);
      });
    })
  });

  it('call to fs.existsSync() should return true for /sys/class/gpio/export', function(done) {
    gpioMock.start(function(err) {
      var exists = fs.existsSync('/sys/class/gpio/export');
      expect(exists).to.equal(true);
      done();
    });
  });

  it('call to fs.writeFileSync() should redirect /sys/class/gpio/export to ./sys/class/gpio/export', function(done) {
    gpioMock.start(function(err) {
      fs.writeFileSync('/sys/class/gpio/export', '1');
      gpioMock.ofs.readFile('./sys/class/gpio/export', 'utf8', function(err, fd) {
        expect(err).to.be.null;
        expect(fd).to.equal('1');
        fs.writeFileSync('/sys/class/gpio/unexport', '1');
        done();
      });
    });
  });

  it('call to fs.readFile() should redirect /sys/class/gpio/export to ./sys/class/gpio/export', function(done) {
    gpioMock.start(function(err) {
      fs.writeFileSync('/sys/class/gpio/export', '1');
      fs.readFile('/sys/class/gpio/export', 'utf8', function(err, fd) {
        expect(err).to.be.null;
        expect(fd).to.equal('1');
        fs.writeFileSync('/sys/class/gpio/unexport', '1');
        done();
      });
    });
  });

  it('calling start with argument should change mock location', function(done) {
    gpioMock.start('./mock/', function(err) {
      fs.writeFileSync('/sys/class/gpio/export', '1');
      gpioMock.ofs.readFile('./mock/sys/class/gpio/export', 'utf8', function(err, fd) {
        expect(err).to.be.null;
        expect(fd).to.equal('1');
        fs.writeFileSync('/sys/class/gpio/unexport', '1');
        done();
      });
    });
  });
});