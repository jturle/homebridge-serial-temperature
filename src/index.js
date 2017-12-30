import SerialPort from 'serialport';

const parsers = SerialPort.parsers;

let Service, Characteristic;

const CELSIUS_UNITS = 'C',
  FAHRENHEIT_UNITS = 'F';
const DEF_MIN_TEMPERATURE = -100,
  DEF_MAX_TEMPERATURE = 100,
  DEF_UNITS = FAHRENHEIT_UNITS,
  DEF_TIMEOUT = 5000,
  DEF_INTERVAL = 120000, //120s
  DEF_BAUD = 57600;


class SerialTemperature {
  constructor(log, config) {
    this.log = log;

    this.port = config["port"];
    this.baud = config["baud"] || DEF_BAUD;
    this.name = config["name"];
    this.manufacturer = config["manufacturer"] || "@jturle manufacturer";
    this.model = config["model"] || "Model not available";
    this.serial = config["serial"] || "Non-defined serial";
    this.fieldName = (config["field_name"] != null ? config["field_name"] : "temperature");
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

    const parser = new parsers.Readline({
      delimiter: '\n'
    });
    this.activePort = new SerialPort(this.port, {
      baudRate: this.baud
    });
    this.activePort.pipe(parser);

    this.activePort.on('open', () => this.log('Serial port open'));

    parser.on('data', this.setValue.bind(this));
  }

  setValue(value) {
    this.log('Read Temperature Value: ' + value);
    if (this.units === FAHRENHEIT_UNITS) {
      value = (value - 32) / 1.8;
      this.log('Converted Fahrenheit temperature to celsius: ' + value);
    }
    this.recent_value = value;
  }

  updateState() {
    //Ensure previous call finished
    if (this.waiting_response) {
      this.log('Avoid updateState as previous response does not arrived yet');
      return;
    }
    this.waiting_response = true;
    this.last_value = new Promise((resolve, reject) => {
      // this.log('Requesting temperature on "' + this.port + '", baud ' + this.baud);
      this.waiting_response = false;
      resolve(this.recent_value);
    }).then((value) => {
      if (this.temperatureService)
        this.temperatureService
          .getCharacteristic(Characteristic.CurrentTemperature).updateValue(value, null);
      return value;
    }, (error) => {
      //For now, only to avoid the NodeJS warning about uncatched rejected promises
      return error;
    });
  }

  getState(callback) {
    this.log('Call to SerialTemperature->getState');
    this.updateState(); //This sets the promise in last_value
    this.last_value.then((value) => {
      callback(null, value);
      return value;
    }, (error) => {
      callback(error, null);
      return error;
    });
  }

  getServices() {
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.temperatureService = new Service.TemperatureSensor(this.name);
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getState.bind(this))
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature
      });

    if (this.update_interval > 0) {
      this.timer = setInterval(this.updateState.bind(this), this.update_interval);
    }

    return [this.informationService, this.temperatureService];
  }
}

const initializer = (log, config) => {
  return new SerialTemperature(log, config);
}
//export const SerialTemperature = new SerialTemperature;
export const classTest = SerialTemperature;
export default (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-serial-temperature", "SerialTemperature", initializer);
}