# GPIO Mock
[![NPM](https://nodei.co/npm/gpio-mock.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/gpio-mock/)

[![Build Status](https://travis-ci.org/Ozsie/gpioMock.svg?branch=master)](https://travis-ci.org/Ozsie/gpioMock)
[![Coverage Status](https://coveralls.io/repos/github/Ozsie/gpioMock/badge.svg?branch=master)](https://coveralls.io/github/Ozsie/gpioMock?branch=master)

A framework to mock GPIO by redirecting calls to /sys/class/gpio/* to ./sys/class/gpio/*

This framework does not provide any simulated hardware, with the exception of DS18B20 digital thermomters which can be
simulated in a number of ways.

GPIO Mock redirects any fs function call concerning paths starting with '/sys/class/gpio' to (by default)
'./sys/class/gpio'. This means that tests that either do not require hardware, or tests that can function with
simulated hardware can function without changes to the code.

## Documentation
Version [1.2.0](https://ozsie.github.io/gpioMock/gpio-mock/1.2.0)

#### Older versions
* Version [1.1.2](https://ozsie.github.io/gpioMock/gpio-mock/1.1.2)
* Version [1.1.1](https://ozsie.github.io/gpioMock/gpio-mock/1.1.1)
* Version [1.1.0](https://ozsie.github.io/gpioMock/gpio-mock/1.1.0)
* Version [1.0.1](https://ozsie.github.io/gpioMock/gpio-mock/1.0.1)
* Version [1.0.0](https://ozsie.github.io/gpioMock/gpio-mock/1.0.0)

## Some examples

### Using 'fs' directly

####Test
```
let gpioMock = require('gpio-mock');
let fs = require('fs');

gpioMock.start(function(err) {
  fs.writeFile('/sys/class/gpio/export', '1', function(err) {
    if (!err) {
      // GPIO 1 is exported.
      fs.writeFile('/sys/class/gpio/gpio1/direction', 'out', function(err) {
        if (!err) {
          // GPIO 1 is set to out
          fs.writeFile('/sys/class/gpio/gpio1/value', 1, function(err) {
            // GPIO 1 is set to high
          }
        }
      });
    }
  });
  
  // Reset changes to fs when done
  gpioMock.stop();
});
```

#### Simulated hardware

```
let fs = require('fs');

// Simulated LED
function ledSwitch() {
  setTimeout(function() {
    fs.readFile('./sys/gpio/gpio1/value', 'utf8', function(err, fd) {
      if (!err && fd === '1') {
        console.log('LED is on!');
      }
    });
    ledSwitch();
  }, 200)
}
```

The simulated LED above could just as well be an IR LED, with a simulated IR receiver writing '1' to
./sys/class/gpio/gpio2/value when GPIO1 is '1', and writing '2' when GPIO1 is '0';


### Using mc-gpio

####Test
```
let gpioMock = require('gpio-mock');
let gpio = require('mc-gpio');

gpioMock.start(function(err) {
  gpio.openPinOut(1, function(err, data) {
    if (!err) {
      // GPIO1 is open and set to out
      gpio.write(1, '1', function(err, data) {
        if (!err) {
          // GPIO1 is set to high
        }
      }
    }
  });
  
  // Reset changes to fs when done
  gpioMock.stop();
});
```

#### Simulated hardware

```
let fs = require('fs');

// Simulated LED
function ledSwitch() {
  setTimeout(function() {
    fs.readFile('./sys/gpio/gpio1/value', 'utf8', function(err, fd) {
      if (!err && fd === '1') {
        console.log('LED is on!');
      }
    });
    ledSwitch();
  }, 200)
}
```

### Simulating DS18B20 digital thermometer
```
let gpioMock = require('gpio-mock');
let ds18b20 = require('mc-tempsensor');

// Hardware definition for DS18B20;
let f = {
  "behavior": "function",
  "temperature": function() {
    return Math.random() * 100000;
  }
};

gpioMock.start(function(err) {
  gpioMock.addMockHardwareModule('ds18b20', 'ds18b20.js', function(err) {
    if (!err) {
      gpioMock.addMockHardware('ds18b20', '28-800000263717', f, function(err) {
        if (!err) {
          tempsensor.init('28-800000263717');
      
          tempSensor.readAndParse(function(err, data) {
            if (err) {
              // Handle error
            } else {
              console.log('Temperature is ' + data[0].temperature.celcius + ' C');
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
});
```

For some more concrete examples, take a look at [Mash Control](https://github.com/Ozsie/mashControl)

### Adding additional mock hardware

If the basic GPIO mocking is not enough, for example when using something that behaves similar to the DS18B20 digital
thermometer, you can write a Mock Hardware module and add it as the above example shows.

Have a look att ds18b20.js for a functioning implementation and mockHardwareExample.js for a skeleton. What is most
important are the functions and variables exposed by the module. Below is the module.exports taken from
mockHardwareExample.js

```
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
```

This is the minimum required by GPIO Mock to work.

* `functionHardware = function() {};`
  * Called every 500 ms when updating mocked hardware. This is used to update mocked hardware according to a function
* `staticHardware = function() {};`
  * Called every 500 ms when updating mocked hardware. This is used to reset mocked hardware to a set value, in case any
    external process has manipulated it.
* `stop = function() {};`
  * Called when gpio-mock is stopped. This should stop everything in the mocked hardware module and clear all mocked
    hardware.
* `add = function(id, hardwareDefinition, callback) {};`
  * Called to add a new instance of the mocked hardware. This function should not replace already existing mocked
    hardware.
    * `id` a unique id for the mocked hardware instance
    * `hardwareDefinition` an object representing the hardware instance
    * `callback` callback function
* `set = function(id, hardwareDefinition, callback) {};`
  * Called to replace an instance of the mocked hardware.
    * `id` id for the mocked hardware instance to update the definition of
    * `hardwareDefinition` an object representing the hardware instance
    * `callback` callback function
* `remove = function(id, callback) {};`
  * Called to remove an instance of the mocked hardware.
    * `id` id of the mocked hardware instance to remove
    * `callback` callback function
* `sysPath`
  * This is a constant string representation of any file system representation if the mocked hardware, it should point
    to the 'root' directory of the hardware in the file system.
* `mockPath`
  * This is a variable string representation of the mocked file system representation. It can be given a default value, 
    however gpio-mock will overwrite it.