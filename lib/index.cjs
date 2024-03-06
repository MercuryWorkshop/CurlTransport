'use strict';

const { resolve } = require('node:path');

const libcurlPath = resolve(__dirname, '..', 'dist');

exports.libcurlPath = libcurlPath;
