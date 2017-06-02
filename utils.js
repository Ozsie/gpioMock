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

let updatePaths = function(mockLocation) {
  mockDS18B20Path = mockLocation + sysDS18B20Path;
  mockGPIOPath = mockLocation + sysGPIOPath;
  createDirectories(mockDS18B20Path);
  createDirectories(mockGPIOPath);
}

let createDirectories = function(path) {
  fs.stat(mockGPIOPath, function (err, stats) {
    if (err) {
      mkdirp(path, function(err) {
        if (err) {
          console.log(err);
        }
      });
    }
    if (!stats.isDirectory()) {
      callback(new Error(path + ' exists and is not a directory!'));
    }
  });
};

module.exports = {
  replacePath: replacePath,
  updatePaths: updatePaths
};