'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.classTest = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _serialport = require('serialport');

var _serialport2 = _interopRequireDefault(_serialport);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var parsers = _serialport2.default.parsers;

var Service = void 0,
    Characteristic = void 0;

var CELSIUS_UNITS = 'C',
    FAHRENHEIT_UNITS = 'F';
var DEF_MIN_TEMPERATURE = -100,
    DEF_MAX_TEMPERATURE = 100,
    DEF_UNITS = FAHRENHEIT_UNITS,
    DEF_TIMEOUT = 5000,
    DEF_INTERVAL = 120000,
    //120s
DEF_BAUD = 57600;

var SerialTemperature = function () {
  function SerialTemperature(log, config) {
    var _this = this;

    _classCallCheck(this, SerialTemperature);

    this.log = log;

    this.port = config["port"];
    this.baud = config["baud"] || DEF_BAUD;
    this.name = config["name"];
    this.manufacturer = config["manufacturer"] || "@jturle manufacturer";
    this.model = config["model"] || "Model not available";
    this.serial = config["serial"] || "Non-defined serial";
    this.fieldName = config["field_name"] != null ? config["field_name"] : "temperature";
    this.timeout = config["timeout"] || DEF_TIMEOUT;
    this.minTemperature = config["min_temp"] || DEF_MIN_TEMPERATURE;
    this.maxTemperature = config["max_temp"] || DEF_MAX_TEMPERATURE;
    this.units = config["units"] || DEF_UNITS;
    this.update_interval = Number(config["update_interval"] || DEF_INTERVAL);

    //Check if units field is valid
    this.units = this.units.toUpperCase();
    if (this.units !== CELSIUS_UNITS && this.units !== FAHRENHEIT_UNITS) {
      this.log('Bad temperature units : "' + this.units + '" (assuming Celsius).');
      this.units = CELSIUS_UNITS;
    }

    // Internal variables
    this.last_value = null;
    this.recent_value = 0;
    this.waiting_response = false;

    var parser = new parsers.Readline({
      delimiter: '\n'
    });
    this.activePort = new _serialport2.default(this.port, {
      baudRate: this.baud
    });
    this.activePort.pipe(parser);

    this.activePort.on('open', function () {
      return _this.log('Serial port open');
    });

    parser.on('data', this.setValue.bind(this));
  }

  _createClass(SerialTemperature, [{
    key: 'setValue',
    value: function setValue(value) {
      this.log('Read Temperature Value: ' + value);
      /*
      if (this.units === FAHRENHEIT_UNITS) {
        value = (value - 32) / 1.8;
        this.log('Converted Fahrenheit temperature to celsius: ' + value);
      }
       */
      value = value * -1 * -1;
      this.recent_value = value;
    }
  }, {
    key: 'updateState',
    value: function updateState() {
      var _this2 = this;

      //Ensure previous call finished
      if (this.waiting_response) {
        this.log('Avoid updateState as previous response does not arrived yet');
        return;
      }
      this.waiting_response = true;
      this.last_value = new Promise(function (resolve, reject) {
        // this.log('Requesting temperature on "' + this.port + '", baud ' + this.baud);
        _this2.waiting_response = false;
        resolve(_this2.recent_value);
      }).then(function (value) {
        if (_this2.temperatureService) _this2.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(value, null);
        return value;
      }, function (error) {
        //For now, only to avoid the NodeJS warning about uncatched rejected promises
        return error;
      });
    }
  }, {
    key: 'getState',
    value: function getState(callback) {
      this.log('Call to SerialTemperature->getState');
      this.updateState(); //This sets the promise in last_value
      this.last_value.then(function (value) {
        callback(null, value);
        return value;
      }, function (error) {
        callback(error, null);
        return error;
      });
    }
  }, {
    key: 'getServices',
    value: function getServices() {
      this.informationService = new Service.AccessoryInformation();
      this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer).setCharacteristic(Characteristic.Model, this.model).setCharacteristic(Characteristic.SerialNumber, this.serial);

      this.temperatureService = new Service.TemperatureSensor(this.name);
      this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getState.bind(this)).setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature
      });

      if (this.update_interval > 0) {
        this.timer = setInterval(this.updateState.bind(this), this.update_interval);
      }

      return [this.informationService, this.temperatureService];
    }
  }]);

  return SerialTemperature;
}();

var initializer = function initializer(log, config) {
  return new SerialTemperature(log, config);
};
//export const SerialTemperature = new SerialTemperature;
var classTest = exports.classTest = SerialTemperature;
module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-serial-temperature", "SerialTemperature", initializer);
};