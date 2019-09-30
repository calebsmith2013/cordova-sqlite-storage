(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('websql/custom')) :
  typeof define === 'function' && define.amd ? define(['websql/custom'], factory) :
  (global.sqlitePlugin = factory(global.customOpenDatabase));
}(this, (function (customOpenDatabase) { 'use strict';

  customOpenDatabase = customOpenDatabase && customOpenDatabase.hasOwnProperty('default') ? customOpenDatabase['default'] : customOpenDatabase;

  function map(arr, fun) {
    var len = arr.length;
    var res = Array(len);
    for (var i = 0; i < len; i++) {
      res[i] = fun(arr[i], i);
    }
    return res;
  }

  function zipObject(props, values) {
    var res = {};
    var len = Math.min(props.length, values.length);
    for (var i = 0; i < len; i++) {
      res[props[i]] = values[i];
    }
    return res;
  }

  function SQLiteResult(error, insertId, rowsAffected, rows) {
    this.error = error;
    this.insertId = insertId;
    this.rowsAffected = rowsAffected;
    this.rows = rows;
  }

  function massageError(err) {
    return typeof err === 'string' ? new Error(err) : err;
  }

  function SQLiteDatabase(name) {
    this._name = name;
  }

  function dearrayifyRow(res) {
    // use a compressed array format to send minimal data between
    // native and web layers
    var rawError = res[0];
    if (rawError) {
      return new SQLiteResult(massageError(res[0]));
    }
    var insertId = res[1];
    if (insertId === null) {
      insertId = void 0; // per the spec, should be undefined
    }
    var rowsAffected = res[2];
    var columns = res[3];
    var rows = res[4];
    var zippedRows = [];
    for (var i = 0, len = rows.length; i < len; i++) {
      zippedRows.push(zipObject(columns, rows[i]));
    }

    // v8 likes predictable objects
    return new SQLiteResult(null, insertId, rowsAffected, zippedRows);
  }

  // send less data over the wire, use an array
  function arrayifyQuery(query) {
    return [query.sql, (query.args || [])];
  }

  SQLiteDatabase.prototype.exec = function exec(queries, readOnly, callback) {

    function onSuccess(rawResults) {
      if (typeof rawResults === 'string') {
        rawResults = JSON.parse(rawResults);
      }
      var results = map(rawResults, dearrayifyRow);
      callback(null, results);
    }

    function onError(err) {
      callback(massageError(err));
    }

    cordova.exec(onSuccess, onError, 'SQLitePlugin', 'exec', [
      this._name,
      map(queries, arrayifyQuery),
      readOnly
    ]);
  };

  var openDB = customOpenDatabase(SQLiteDatabase);

  function SQLitePlugin() {
  }

  function openDatabase(name, version, description, size, callback) {
    if (name && typeof name === 'object') {
      // accept SQLite Plugin 1-style object here
      callback = version;
      size = name.size;
      description = name.description;
      version = name.version;
      name = name.name;
    }
    if (!size) {
      size = 1;
    }
    if (!description) {
      description = name;
    }
    if (!version) {
      version = '1.0';
    }
    if (typeof name === 'undefined') {
      throw new Error('please be sure to call: openDatabase("myname.db")');
    }
    return openDB(name, version, description, size, callback);
  }

  SQLitePlugin.prototype.openDatabase = openDatabase;

  var index = new SQLitePlugin();

  return index;

})));
