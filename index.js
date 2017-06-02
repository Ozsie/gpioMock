/* jshint node: true */
'use strict';

let fs = require('fs');
let cept = require('cept');
let rimraf = require('rimraf');
let mkdirp = require('mkdirp');
let utils = require('./utils');

console.log(JSON.stringify(utils));

var ofs = {
  existsSync: fs.existsSync,
  writeFile: fs.writeFile,
  writeFileSync: fs.writeFileSync,
  readFile: fs.readFile
};

var stoppers = [];

let checkExport = function() {
  ofs.readFile('./sys/class/gpio/export', 'utf8', function(err, data) {
    if (!err && data && typeof parseInt(data) === 'number' && !ofs.existsSync('./sys/class/gpio/gpio' + data)) {
      console.log('export');
      fs.mkdirSync('./sys/class/gpio/gpio' + data);
      ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/direction', 'in');
      ofs.writeFileSync('./sys/class/gpio/gpio' + data + '/value', '0');
      ofs.writeFileSync('./sys/class/gpio/export', '');
    }
  });
};

let checkUnexport = function() {
  ofs.readFile('./sys/class/gpio/unexport', 'utf8', function(err, data) {
    console.log('check unexport');
    if (!err && data && typeof parseInt(data) === 'number' && ofs.existsSync('./sys/class/gpio/gpio' + data)) {
      console.log('unexporting');
      rimraf('./sys/class/gpio/gpio' + data, function(err, data) {
        ofs.writeFileSync('./sys/class/gpio/unexport', '');
        console.log('rimraf err ' + err);
        console.log('rimraf data ' + data);
      });
    } else {
      console.log('err ' + err);
      console.log('data ' + data);
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
      console.log('Replaced path ' + path);
      return ofs.existsSync(path);
    })
  );

  stoppers.push(
    cept(fs, 'writeFile', function(path, value, callback) {
      path = utils.replacePath(path);
      console.log("mocking writeFile " + path);
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
    cept(fs, 'readFile', function(path, value, callback) {
      path = utils.replacePath(path);
      ofs.readFile(path, value, callback);
    })
  );
};

let start = function(mockLocation) {
  if (!mockLocation) {
    mockLocation = '.';
  }
  utils.updatePaths(mockLocation);
  mock();
  startWatcher();
  console.log("Mock located in " + mockLocation);
};

let stop = function() {
  for (var i in stoppers) {
    stoppers[i]();
  }
};

module.exports = {
  start: start,
  stop: stop
};