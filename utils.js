/* jshint node: true */
'use strict';

let fs = require('fs');
let mkdirp = require('mkdirp');

let sysGPIOPath = '/sys/class/gpio'
let sysDS18B20Path = '/sys/bus/w1/devices/';

var mockGPIOPath = './sys/class/gpio';
var mockDS18B20Path = './sys/bus/w1/devices';

let replacePath = function(path) {
  if (path && path.startsWith(sysGPIOPath)) {
    path = path.replace(sysGPIOPath, mockGPIOPath);
  } else if (path && path.startsWith(sysDS18B20Path)) {
    path = path.replace(sysDS18B20Path, mockDS18B20Path)
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
}

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

module.exports = {
  replacePath: replacePath,
  updatePaths: updatePaths,
  mockGPIOPath: mockGPIOPath,
  mockDS18B20Path: mockDS18B20Path
};