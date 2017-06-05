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
/*
  after(function(done) {
    rimraf('./sys', function() {
      rimraf('./mock', function() {
        done();
      });
    });
  });
*/
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

  it('adding mock hardware should update its mock path', function(done) {
    gpioMock.start(function(err) {
      gpioMock.addMockHardwareModule('ds18b20', './node_modules/ds18b20-gpio-mock/ds18b20.js', function(err) {
        expect(err).to.not.exist;
        gpioMock.addMockHardware('ds18b20', '1', {behavior: 'static', temperature: 12}, function(err) {
          var tempData = fs.readFileSync('/sys/bus/w1/devices/1/w1_slave', 'utf8');
          var tempDataFromMockPath = gpioMock.ofs.readFileSync('./sys/bus/w1/devices/1/w1_slave', 'utf8');
          expect(tempData).to.equal('00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=12000');
          expect(tempData).to.equal(tempDataFromMockPath);
          done();
        });
      });
    });
  });

  it('adding mock hardware module with existing id should return an error', function(done) {
    gpioMock.start(function(err) {
      gpioMock.addMockHardwareModule('ds18b20', './node_modules/ds18b20-gpio-mock/ds18b20.js', function(err) {
        expect(err).to.not.exist;
        gpioMock.addMockHardwareModule('ds18b20', './node_modules/ds18b20-gpio-mock/ds18b20.js', function(err) {
          expect(err).to.exist;
          done();
        });
      });
    });
  });

  it('static/function mock hardware should update every 500 ms', function(done) {
    gpioMock.start(function(err) {
      gpioMock.addMockHardwareModule('ds18b20', './node_modules/ds18b20-gpio-mock/ds18b20.js', function(err) {
        expect(err).to.not.exist;
        gpioMock.addMockHardware('ds18b20', '1', {behavior: 'static', temperature: 12}, function(err) {
          var tempDataBeforeWrite = fs.readFileSync('/sys/bus/w1/devices/1/w1_slave', 'utf8');
          fs.writeFileSync('/sys/bus/w1/devices/1/w1_slave',
                           '00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=32000',
                           'utf8');
          var tempDataAfterWrite = fs.readFileSync('/sys/bus/w1/devices/1/w1_slave', 'utf8');

          expect(tempDataBeforeWrite).to.equal('00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=12000');
          expect(tempDataAfterWrite).to.equal('00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=32000');
          setTimeout(function() {
            var tempDataAfterWait = fs.readFileSync('/sys/bus/w1/devices/1/w1_slave', 'utf8');
            expect(tempDataAfterWait).to.equal(tempDataBeforeWrite);
            done();
          }, 600);
        });
      });
    });
  });

  it('setting mock hardware should update it', function(done) {
    gpioMock.start(function(err) {
      gpioMock.addMockHardwareModule('ds18b20', './node_modules/ds18b20-gpio-mock/ds18b20.js', function(err) {
        expect(err).to.not.exist;
        gpioMock.addMockHardware('ds18b20', '1', {behavior: 'static', temperature: 12}, function(err) {
          var tempDataBeforeSet = fs.readFileSync('/sys/bus/w1/devices/1/w1_slave', 'utf8');
          expect(tempDataBeforeSet).to.equal('00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=12000');
          gpioMock.setMockHardware('ds18b20', '1', {behavior: 'static', temperature: 32}, function(err) {
            var tempDataAfterSet = fs.readFileSync('/sys/bus/w1/devices/1/w1_slave', 'utf8');
            expect(tempDataAfterSet).to.equal('00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=32000');
            done();
          });
        });
      });
    });
  });

});