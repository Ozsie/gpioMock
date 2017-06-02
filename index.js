/* jshint node: true */
'use strict';

let fs = require('fs');
let cept = require('cept');
let rimraf = require('rimraf');
let mkdirp = require('mkdirp');
let utils = require('./utils');

var mockGPIOPath;
var mockDS18B20Path;

var ofs = {
  existsSync: fs.existsSync,
  writeFile: fs.writeFile,
  writeFileSync: fs.writeFileSync,
  readFile: fs.readFile
};

var stoppers = [];
var ds18b20 = {};

let checkExport = function() {
  ofs.readFile('./sys/class/gpio/export', 'utf8', function(err, data) {
    if (!err && data && typeof parseInt(data) === 'number' && !ofs.existsSync('./sys/class/gpio/gpio' + data)) {
      fs.mkdirSync('./sys/class/gpio/gpio' + data);
      ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/direction', 'in');
      ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/value', '0');
      ofs.writeFileSync('./sys/class/gpio/export', '');
    }
  });
};

let checkUnexport = function() {
  ofs.readFile('./sys/class/gpio/unexport', 'utf8', function(err, data) {
    if (!err && data && typeof parseInt(data) === 'number' && ofs.existsSync('./sys/class/gpio/gpio' + data)) {
      rimraf('./sys/class/gpio/gpio' + data, function(err, data) {
        ofs.writeFileSync('./sys/class/gpio/unexport', '');
      });
    }
  });
};

let startWatcher = function() {
  setTimeout(function () {
    checkExport();
    checkUnexport();
    startWatcher();
  }, 500);
};

let mock = function() {
  stoppers.push(
    cept(fs, 'existsSync', function(path) {
      path = utils.replacePath(path);
      return ofs.existsSync(path);
    })
  );

  stoppers.push(
    cept(fs, 'writeFile', function(path, value, callback) {
      path = utils.replacePath(path);
      ofs.writeFile(path, value, callback);
    })
  );

  stoppers.push(
    cept(fs, 'writeFileSync', function(path, value, callback) {
      path = utils.replacePath(path);
      ofs.writeFileSync(path, value, callback);
    })
  );

  stoppers.push(
    cept(fs, 'readFile', function(path, encoding, callback) {
      path = utils.replacePath(path);
      ofs.readFile(path, encoding, callback);
    })
  );

  ofs.readFile('ds18b20.json', 'utf8', function(err, fd) {
    if (!err) {
      ds18b20 = JSON.parse(fd);

      let sensorFunction = function(sensor) {
        setTimeout(function() {
          /* jshint ignore:start */
          var fn = Function(sensor.temperature);
          var value = fn();
          ofs.writeFileSync(mockDS18B20Path + '/' + key + '/w1_slave', value);
          if (!sensor.stop) {
            sensorFunction();
          }
          /* jshint ignore:end */
        }, 250);
      };

      let sensorStatic = function(sensor) {
        setTimeout(function() {
          ofs.writeFileSync(mockDS18B20Path + '/' + key + '/w1_slave', parseInt(sensor.temperature * 1000));
          if (!sensor.stop) {
            sensorStatic();
          }
        }, 250);
      };

      let addW1Slave = function(key) {
        let sensor = ds18b20[key];
        mkdirp(mockDS18B20Path + '/' + key, function(err) {
          if (!err) {
            if (sensor.behavior === 'static') {
              sensorStatic(sensor);
            } else if (sensor.behavior === 'external') {
              ofs.writeFileSync(mockDS18B20Path + '/' + key + '/w1_slave', parseInt(sensor.temperature * 1000));
            } else {
              sensorFunction(sensor);
            }
          }
        });
      };

      for (var key in ds18b20) {
        addW1Slave(key);
      }
    }
  });
};

let start = function(mockLocation, callback) {
  if (typeof mockLocation === 'function') {
    callback = mockLocation;
    mockLocation = undefined;
  }
  if (!mockLocation) {
    mockLocation = '.';
  }
  utils.updatePaths(mockLocation, function(err) {
    if (!err) {
      mockGPIOPath = utils.mockGPIOPath;
      mockDS18B20Path = utils.mockDS18B20Path;
      mock();
      startWatcher();
      console.log("Mock located in " + mockLocation);
      callback();
    } else {
      console.error(err);
      callback(err);
    }
  });
};

let stop = function() {
  for (var i in stoppers) {
    stoppers[i]();
  }
  for (var id in ds18b20) {
    var sensor = ds18b20[id];
    sensor.stop = true;
  }
};

module.exports = {
  start: start,
  stop: stop,
  ofs: ofs
};