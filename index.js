/* jshint node: true */
'use strict';

let fs = require('fs');
let cept = require('cept');
let rimraf = require('rimraf');
let mkdirp = require('mkdirp');
let ds18b20 = require('./ds18b20');

var mockGPIOPath;

var ofs = {};

var stoppers = [];

let sysGPIOPath = '/sys/class/gpio';

var mockGPIOPath = './sys/class/gpio';

let replacePath = function(path) {
  if (path && typeof path !== 'string') {
    return path;
  }
  if (path && typeof path === 'string' && path.startsWith(sysGPIOPath)) {
    path = path.replace(sysGPIOPath, mockGPIOPath);
  } else if (path && typeof path === 'string' && path.startsWith(ds18b20.sysPath)) {
    path = path.replace(ds18b20.sysPath, ds18b20.mockPath);
  }
  return path;
};

let updatePaths = function(mockLocation, callback) {
  var prefix = mockLocation;
  if (mockLocation.endsWith('/')) {
    prefix = mockLocation.substring(0, mockLocation.length - 1);
  }
  mockGPIOPath = prefix + sysGPIOPath;
  createDirectories(mockGPIOPath, function() {
    ds18b20.mockPath = prefix + ds18b20.sysPath;
    createDirectories(ds18b20.mockPath, callback);
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
    ds18b20.sensorFunction();
    ds18b20.sensorStatic();
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

  ds18b20.mock();
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
      mock();
      startWatcher();
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
  stoppers = [];
  ds18b20.stop();
};

let addDS18B20 = function(id, sensor, callback) {
  ds18b20.addDS18B20(id, sensor, callback);
};

let setDS18B20 = function(id, sensor, callback) {
  ds18b20.setDS18B20(id, sensor, callback);
};

module.exports = {
  start: start,
  stop: stop,
  addDS18B20: addDS18B20,
  setDS18B20: setDS18B20,
  ofs: ofs
};