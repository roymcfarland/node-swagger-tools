/* global describe, it */

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Apigee Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// Here to quiet down Connect logging errors
process.env.NODE_ENV = 'test';

var _ = require('lodash');
var assert = require('assert');
var async = require('async');
var helpers = require('../helpers');
var path = require('path');
var request = require('supertest');

var rlJson = _.cloneDeep(require('../../samples/1.2/resource-listing.json'));
var petJson = _.cloneDeep(require('../../samples/1.2/pet.json'));
var storeJson = _.cloneDeep(require('../../samples/1.2/store.json'));
var userJson = _.cloneDeep(require('../../samples/1.2/user.json'));

describe('Swagger UI Middleware v1.2', function () {
  it('should serve Swagger documents at /api-docs by default', function (done) {
    var pathMap = _.reduce([rlJson, petJson, storeJson, userJson], function (map, resource) {
      map['/api-docs' + (resource.resourcePath || '')] = resource;

      return map;
    }, {});

    async.map(Object.keys(pathMap), function (path, callback) {
      helpers.createServer([rlJson, [petJson, storeJson, userJson]], {}, function (app) {
        request(app)
          .get(path)
          .expect(200)
          .end(helpers.expectContent(pathMap[path], callback));
      });
    }, function (err) {
      if (err) {
        throw err;
      }

      done();
    });
  });

  it('should serve Swagger documents at requested location', function (done) {
    var options = {
      apiDocs: '/api-docs2'
    };
    var pathMap = _.reduce([rlJson, petJson, storeJson, userJson], function (map, resource) {
      map['/api-docs2' + (resource.resourcePath || '')] = resource;

      return map;
    }, {});

    async.map(Object.keys(pathMap), function (path, callback) {
      helpers.createServer([rlJson, [petJson, storeJson, userJson]], {
        swaggerUiOptions: options
      }, function (app) {
        request(app)
          .get(path)
          .expect(200)
          .end(helpers.expectContent(pathMap[path], callback));
      });
    }, function (err) {
      if (err) {
        throw err;
      }

      done();
    });
  });

  it('should serve Swagger UI at /docs by default', function (done) {
    helpers.createServer([rlJson, [petJson, storeJson, userJson]], {}, function (app) {
      request(app)
        .get('/docs/') // Trailing slash to avoid a 303
        .expect(200)
        .expect('content-type', 'text/html; charset=UTF-8')
        .end(done);
    });
  });

  it('should serve Swagger UI at requested location', function (done) {
    helpers.createServer([rlJson, [petJson, storeJson, userJson]], {
      swaggerUiOptions: {
        swaggerUi: '/docs2'
      }
    }, function (app) {
      request(app)
        .get('/docs2/') // Trailing slash to avoid a 303
        .expect(200)
        .expect('content-type', 'text/html; charset=UTF-8')
        .end(done);
    });
  });

  describe('issues', function () {
    describe('serve custom swagger-ui (Issue 111)', function () {
      it('should throw error when path points to missing directory', function (done) {
        try {
          helpers.createServer([rlJson, [petJson, storeJson, userJson]], {
            swaggerUiOptions: {
              swaggerUiDir: '../browser'
            }
          }, function () {
            throw Error('Should not initialize with options.swaggerUiDir pointing to a missing path');
          });
        } catch (err) {
          assert.ok(err.message.indexOf('options.swaggerUiDir path does not exist: ') === 0);

          done();
        }
      });

      it('should throw error when path points to a file', function (done) {
        try {
          helpers.createServer([rlJson, [petJson, storeJson, userJson]], {
            swaggerUiOptions: {
              swaggerUiDir: path.join(__dirname, '..', 'browser', 'test-bower.html')
            }
          }, function () {
            throw Error('Should not initialize with options.swaggerUiDir pointing to a file');
          });
        } catch (err) {
          assert.ok(err.message.indexOf('options.swaggerUiDir path is not a directory: ') === 0);

          done();
        }
      });

      it('should serve the content at the specified path', function (done) {
        // This is a convoluted example but since all we have to do is show that the path sent to serve-static is served
        // as requested, that's all this test needs to do.
        helpers.createServer([rlJson, [petJson, storeJson, userJson]], {
          swaggerUiOptions: {
            swaggerUiDir: path.join(__dirname, '..', 'browser')
          }
        }, function (app) {
          request(app)
            .get('/docs/test-bower.html')
            .expect(200)
            .expect('content-type', 'text/html; charset=UTF-8')
            .end(function (err, res) {
              if (err) {
                throw err;
              }

              assert.ok(res.text.indexOf('<title>Mocha Test Runner (Swagger Tools Bower Build)</title>') > -1);

              done();
            });
        });
      });
    });
  });
});
