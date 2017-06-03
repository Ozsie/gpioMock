/**
 * RPi GPIO mock framework.
 * @module gpio-mock
 * @see module:gpio-mock
 * @author Oscar Djupfeldt
 */

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

var exportUnexport = function(filename, data) {
  if (!data || typeof parseInt(data) !== 'number') {
    return;
  }
  if (filename === 'export' && !ofs.existsSync('./sys/class/gpio/gpio' + data)) {
    ofs.mkdirSync('./sys/class/gpio/gpio' + data);
    ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/direction', 'in');
    ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/value', '0');
    ofs.writeFileSync('./sys/class/gpio/export', '');
  } else if(filename === 'unexport' && ofs.existsSync('./sys/class/gpio/gpio' + data)) {
    rimraf('./sys/class/gpio/gpio' + data, function(err, data) {
      ofs.writeFileSync('./sys/class/gpio/unexport', '');
    });
  }
};

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
    fs.closeSync(fs.openSync(mockGPIOPath + '/export', 'w'));
    fs.closeSync(fs.openSync(mockGPIOPath + '/unexport', 'w'));
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

let startWatcher = function() {
  setTimeout(function () {
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
          if (index === 'writeFile' || index === 'writeFileSync') {
            if (arguments[0].endsWith('unexport')) {
              console.log('Unexport ' + arguments[1]);
              exportUnexport('unexport', arguments[1]);
            } else if (arguments[0].endsWith('export')) {
              console.log('Export ' + arguments[1]);
              exportUnexport('export', arguments[1]);
            }
          }
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
};

/**
 * Initializes the framework. Calling this function will override any call to fs where the path starts with either
 * /sys/class/gpio or /sys/bus/w1/devices. By default the overrides are ./sys/class/gpio and ./sys/bus/w1/devices.
 *
 * @function start
 * @param {string} mockLocation If a value is passed, this is prepended to the real path to form the new mock path
 * @param {Function} callback Called when start is finished
 */
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

/**
 * Stops the framework. Calling this function will reset fs to default.
 *
 * @function stop
 */
let stop = function() {
  for (var i in stoppers) {
    stoppers[i]();
  }
  stoppers = [];
  ds18b20.stop();
};

/**
 * Adds a new simulated DS18B20 digital thermometer.
 *
 * @function addDS18B20
 * @param {string} id The id of the thermometer, must be unique
 * @param {object} sensor Thermometer description
 * @param {string} sensor.behavior Defines how the thermometer behaves. Should be either 'static', 'external' or
 * 'function'. 'static' continuously resets the w1_slave file to indicate the temperature provided in sensor.temperature.
 * 'external' sets the initial value to the temperature provided in sensor.temperature, but makes no further changes to
 *  w1_slave, allowing for external programs to change the value.
 *  'function' executes the function provided in sensor.temperature continuously.
 * @param {string} sensor.temperature Defines the initial or static temperature, or a function returning the temperature.
 * Values should be 1000 * degrees celcius, no decimals. If sensor.behavior is set to 'function' a function must be
 * provided here, it should return a string representing the temperature, following the same pattern as if set to a fixed
 * value.
 */
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