/* jshint node: true */
'use strict';

let fs = require('fs');
let cept = require('cept');
let rimraf = require('rimraf');
let mkdirp = require('mkdirp');

var mockGPIOPath;
var mockDS18B20Path;

var ofs = {};

var stoppers = [];
var ds18b20 = {};

let sysGPIOPath = '/sys/class/gpio';
let sysDS18B20Path = '/sys/bus/w1/devices/';

var mockGPIOPath = './sys/class/gpio';
var mockDS18B20Path = './sys/bus/w1/devices';

let replacePath = function(path) {
  if (path && typeof path !== 'string') {
    return path;
  }
  if (path && typeof path === 'string' && path.startsWith(sysGPIOPath)) {
    path = path.replace(sysGPIOPath, mockGPIOPath);
  } else if (path && typeof path === 'string' && path.startsWith(sysDS18B20Path)) {
    path = path.replace(sysDS18B20Path, mockDS18B20Path);
  }
  return path;
};

let updatePaths = function(mockLocation, callback) {
  var prefix = mockLocation;
  if (mockLocation.endsWith('/')) {
    prefix = mockLocation.substring(0, mockLocation.length - 1);
  }
  console.log("Mock location " + prefix);
  mockGPIOPath = prefix + sysGPIOPath;
  createDirectories(mockGPIOPath, function() {
    mockDS18B20Path = prefix + sysDS18B20Path;
    createDirectories(mockDS18B20Path, callback);
  });
};

let createDirectories = function(path, callback) {
  fs.stat(path, function (err, stats) {
    // Path does not exist
    if (err) {
      mkdirp(path, function(err) {
        callback(err);
      });
    }
    // Path is not directory
    else if (!stats.isDirectory()) {
      callback(new Error(path + ' exists and is not a directory!'));
    } else {
      callback();
    }
  });
};

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
  let copy = function(index) {
    if (typeof fs[index] === 'function') {
      ofs[index] = fs[index];
    }
  };
  let replace = function(index) {
    if (typeof fs[index] === 'function') {
      ofs[index] = fs[index];
      stoppers.push(
        cept(fs, index, function() {
          var args = [];
          for (var i in arguments) {
            if (typeof arguments[i] === 'string') {
              args.push(replacePath(arguments[i]));
            } else {
              args.push(arguments[i]);
            }
          }
          return ofs[index].apply(this, args);
        })
      );
    }
  };

  for (var index in fs) {
    copy(index);
    replace(index);
  }

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
  updatePaths(mockLocation, function(err) {
    if (!err) {
      console.log('starting');
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
  console.log('STOP');
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