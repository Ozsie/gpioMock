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

var mockGPIOPath;
var ofs = {};
var stoppers = [];
var mockHardwareModules = [];
var mockLocationPath;

let sysGPIOPath = '/sys/class/gpio';
var mockGPIOPath = './sys/class/gpio';

var exportUnexport = function(filename, data) {
  if (!data || isNaN(parseInt(data))) {
    return;
  }
  if (filename === 'export' && !ofs.existsSync('./sys/class/gpio/gpio' + data)) {
    ofs.mkdirSync('./sys/class/gpio/gpio' + data);
  } else if(filename === 'unexport' && ofs.existsSync('./sys/class/gpio/gpio' + data)) {
    rimraf('./sys/class/gpio/gpio' + data, function(err, data) {
    });
  }

  if (filename === 'export') {
    ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/direction', 'in');
    ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/value', '0');
  }
};

let replacePath = function(path) {
  if (path && typeof path !== 'string') {
    return path;
  }
  if (path && typeof path === 'string' && path.startsWith(sysGPIOPath)) {
    path = path.replace(sysGPIOPath, mockGPIOPath);
  } else if (path && typeof path === 'string') {
    for (var name in mockHardwareModules) {
      var mockHardware = mockHardwareModules[name];
      if (path.startsWith(mockHardware.sysPath)) {
        path = path.replace(mockHardware.sysPath, mockHardware.mockPath);
      }
    }
  }
  return path;
};

let getPrefix = function(mockLocation) {
  var prefix = mockLocation;
  if (mockLocation.endsWith('/')) {
    prefix = mockLocation.substring(0, mockLocation.length - 1);
  }
  return prefix;
};

let updatePaths = function(mockLocation, callback) {
  var prefix = getPrefix(mockLocation);
  mockGPIOPath = prefix + sysGPIOPath;
  createDirectories(mockGPIOPath, function() {
    fs.closeSync(fs.openSync(mockGPIOPath + '/export', 'w'));
    fs.closeSync(fs.openSync(mockGPIOPath + '/unexport', 'w'));
    callback();
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
    for (var name in mockHardwareModules) {
      var mockHardware = mockHardwareModules[name];
      mockHardware.functionHardware();
      mockHardware.staticHardware();
    }
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
              exportUnexport('unexport', arguments[1]);
            } else if (arguments[0].endsWith('export')) {
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
  mockLocationPath = mockLocation;
  updatePaths(mockLocation, function(err) {
    if (!err) {
      mock();
      startWatcher();
      callback();
    } else {
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
  for (var name in mockHardwareModules) {
    var mockHardware = mockHardwareModules[name];
    mockHardware.stop();
  }
  mockHardwareModules = {};
};

/**
 * Registers mock hardware to a mock hardware module.
 *
 * @function addMockHardware
 * @param {string} name Name of the mock hardware module
 * @param {string} id Mock hardware id, used by the module to separate different mocked hardware
 * @param {Object} mockHardware Object describing the mocked hardware
 * @param {Function} callback Called when start is finished
 */
let addMockHardware = function(name, id, mockHardware, callback) {
  if (mockHardwareModules[name]) {
    mockHardwareModules[name].add(id, mockHardware, callback);
  } else {
    callback(new Error('Module ' + name + ' is not registered'));
  }
};

/**
 * Registers mock hardware to a mock hardware module.
 *
 * @function addMockHardware
 * @param {string} name Name of the mock hardware module
 * @param {string} id Mock hardware id, used by the module to separate different mocked hardware
 * @param {Object} mockHardware Object describing the mocked hardware
 * @param {Function} callback Called when start is finished
 */
let setMockHardware = function(name, id, mockHardware, callback) {
  mockHardwareModules[name].set(id, mockHardware, callback);
};

/**
 * Registers a mock hardware module.
 *
 * @function addMockHardwareModule
 * @param {string} name Name of the module, used when adding mock hardware to the module
 * @param {string} mockHardwareModule Path to Node module representing the hardware
 * @param {Function} callback Called when start is finished
 */
let addMockHardwareModule = function(name, mockHardwareModule, callback) {
  var err;
  for (var key in mockHardwareModules) {
    if (key === name) {
      err = new Error('Module "' + name + '" already registered');
    }
  }
  if (!err) {
    mockHardwareModules[name] = require(mockHardwareModule);
    var prefix = getPrefix(mockLocationPath);
    mockHardwareModules[name].mockPath = prefix + mockHardwareModules[name].sysPath;
    createDirectories(mockHardwareModules[name].mockPath, callback);
  } else {
    callback(err);
  }
};

module.exports = {
  start: start,
  stop: stop,
  addMockHardwareModule: addMockHardwareModule,
  addMockHardware: addMockHardware,
  setMockHardware: setMockHardware,
  ofs: ofs
};