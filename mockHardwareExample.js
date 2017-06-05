/* jshint node: true */
'use strict';

let fs = require('fs');
let mkdirp = require('mkdirp');

let sysPath = '/default/path';
var mockPath = './default/path';

var hardwareMap = {};

let functionHardware = function() {
  for (var id in hardwareMap) {
    var hardware = hardwareMap[id];
    if (hardware.stop || hardware.behavior !== 'function') {
      return;
    }
    handleFunctionSensor(id, hardware);
  }
};

let handleFunctionSensor = function(id, hardware) {
  // Call hardware.function and update any files accordingly
};

let staticHardware = function() {
  for (var id in hardwareMap) {
    var hardware = hardwareMap[id];
    if (hardware.stop || hardware.behavior !== 'static') {
      return;
    }
    handleStaticSensor(id, hardware);
  }
};

let handleStaticSensor = function(id, hardware) {
  // Reset any files to static value
};

let updateHardware = function(callback) {
  let addHardware = function(key, callback) {
    let hardware = hardwareMap[key];
    hardware.stop = false;
    // Replace tryAddFiles with whatever function you need to call to create directories, files etc
    tryAddFiles(mockPath, function(err) {
      if (!err) {
        hardware.added = true;
        if (hardware.behavior === 'external') {
          handleStaticSensor(key, hardware);
        } else if (hardware.behavior === 'function') {
          handleFunctionSensor(key, hardware);
        } else if (hardware.behavior === 'static') {
          handleStaticSensor(key, hardware);
        }
        callback();
      } else {
        callback(err);
      }
    });
  };

  for (var key in hardwareMap) {
    if (!hardwareMap[key].added) {
      addHardware(key, callback);
    }
  }
};

let stop = function() {
  for (var id in hardwareMap) {
    var hardware = hardwareMap[id];
    hardware.stop = true;
  }
  hardwareMap = {};
};

let add = function(id, hardware, callback) {
  if (hardwareMap[id]) {
    callback(new Error("hardware already registered"));
  } else {
    set(id, hardware, callback);
  }
};

let set = function(id, hardware, callback) {
  hardwareMap[id] = hardware;
  updateHardware(callback);
};

let remove = function(id, callback) {
  hardwareMap[id] = undefined;
  callback();
};

module.exports = {
  functionHardware: functionHardware,
  staticHardware: staticHardware,
  stop: stop,
  add: add,
  set: set,
  remove: remove,
  sysPath: sysPath,
  mockPath: mockPath
};