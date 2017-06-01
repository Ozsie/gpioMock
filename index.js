'use strict';
let fs = require('fs');
let cept = require('cept');
let rimraf = require('rimraf');

let sysPath = '/sys/class/gpio'
let mockPath = './sys/class/gpio'

var ofs = {
  existsSync: fs.existsSync,
  writeFile: fs.writeFile,
  writeFileSync: fs.writeFileSync,
  readFile: fs.readFile
};

var stoppers = [];

let replacePath = function(path) {
  if (path && path.startsWith(sysPath)) {
    path = path.replace(sysPath, mockPath);
  }
  return path;
}

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
    if (!err && data && typeof parseInt(data) === 'number' && ofs.existsSync('./sys/class/gpio/gpio' + data)) {
      rimraf('./sys/class/gpio/gpio' + data, function(err, data) {
        ofs.writeFileSync('./sys/class/gpio/unexport', '');
        console.log('rimraf err ' + err);
        console.log('rimraf data ' + data);
      });
    }
  });
};

let timeout = function() {
  setTimeout(function () {
    checkExport();
    checkUnexport();
    timeout();
  }, 500);
}

timeout();

let start = function() {
  stoppers.push(
    cept(fs, 'existsSync', function(path) {
      path = replacePath(path);
      console.log('Replaced path ' + path)
      return ofs.existsSync(path);
    })
  );

  stoppers.push(
    cept(fs, 'writeFile', function(path, value, callback) {
      path = replacePath(path);
      ofs.writeFile(path, value, callback);
    })
  );

  stoppers.push(
    cept(fs, 'writeFileSync', function(path, value, callback) {
      path = replacePath(path);
      ofs.writeFileSync(path, value, callback);
    })
  );

  stoppers.push(
    cept(fs, 'readFile', function(path, value, callback) {
      path = replacePath(path);
      ofs.readFile(path, value, callback);
    })
  );
};

let stop = function() {
  for (var i in stoppers) {
    stoppers[i]();
  }
}

start();

console.log(fs.existsSync('/sys/class/gpio'));
fs.writeFile('/sys/class/gpio/export', '1', function(err, data) {
  console.log('ex err ' + err);
  console.log('ex dat ' + data);
});

stop();

module.exports = {
  start: start,
  stop: stop
}