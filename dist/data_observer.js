'use strict';
var utils_1 = require('./utils');
var PromiseWrapper = (function () {
    function PromiseWrapper() {
    }
    PromiseWrapper.resolve = function (obj) { return Promise.resolve(obj); };
    PromiseWrapper.reject = function (obj, _) { return Promise.reject(obj); };
    // Note: We can't rename this method into `catch`, as this is not a valid
    // method name in Dart.
    PromiseWrapper.catchError = function (promise, onError) {
        return promise.catch(onError);
    };
    PromiseWrapper.all = function (promises) {
        if (promises.length == 0)
            return Promise.resolve([]);
        return Promise.all(promises);
    };
    PromiseWrapper.then = function (promise, success, rejection) {
        return promise.then(success, rejection);
    };
    PromiseWrapper.wrap = function (computation) {
        return new Promise(function (res, rej) {
            try {
                res(computation());
            }
            catch (e) {
                rej(e);
            }
        });
    };
    PromiseWrapper.scheduleMicrotask = function (computation) {
        PromiseWrapper.then(PromiseWrapper.resolve(null), computation, function (_) { });
    };
    PromiseWrapper.isPromise = function (obj) { return obj instanceof Promise; };
    PromiseWrapper.completer = function () {
        var resolve;
        var reject;
        var p = new Promise(function (res, rej) {
            resolve = res;
            reject = rej;
        });
        return { promise: p, resolve: resolve, reject: reject };
    };
    return PromiseWrapper;
}());
exports.PromiseWrapper = PromiseWrapper;
/**
 * A helper class for data loading events.
 * For example, used in @MeteorComponent to wrap callbacks
 * of the Meteor methods whic allows us to know when
 * requested data is available on the client.
 */
var DataObserver = (function () {
    function DataObserver() {
    }
    DataObserver.pushCb = function (callbacks) {
        var _this = this;
        utils_1.check(callbacks, utils_1.Match.Where(utils_1.isMeteorCallbacks));
        var completer = PromiseWrapper.completer();
        var dequeue = function (promise) {
            var index = _this._promises.indexOf(promise);
            if (index !== -1) {
                _this._promises.splice(index, 1);
            }
        };
        var queue = function (promise) {
            _this._promises.push(promise);
        };
        var promise = completer.promise;
        if (utils_1.isCallbacksObject(callbacks)) {
            var origin_1 = callbacks;
            var object = {
                onError: function (err) {
                    if (origin_1.onError) {
                        origin_1.onError(err);
                    }
                    completer.resolve({ err: err });
                    dequeue(promise);
                },
                onReady: function (result) {
                    if (origin_1.onReady) {
                        origin_1.onReady(result);
                    }
                    completer.resolve({ result: result });
                    dequeue(promise);
                },
                onStop: function (err) {
                    if (origin_1.onStop) {
                        origin_1.onStop(err);
                    }
                    completer.resolve({ err: err });
                    dequeue(promise);
                }
            };
            queue(promise);
            return object;
        }
        var newCallback = function (err, result) {
            callbacks(err, result);
            completer.resolve({ err: err, result: result });
            dequeue(promise);
        };
        queue(promise);
        return newCallback;
    };
    DataObserver.onSubsReady = function (cb) {
        utils_1.check(cb, Function);
        new Promise(function (resolve, reject) {
            var poll = Meteor.setInterval(function () {
                if (DDP._allSubscriptionsReady()) {
                    Meteor.clearInterval(poll);
                    resolve();
                }
            }, 100);
        }).then(function () { return cb(); });
    };
    DataObserver.onReady = function (cb) {
        utils_1.check(cb, Function);
        Promise.all(this._promises).then(function () { return cb(); });
    };
    DataObserver.cbLen = function () {
        return this._promises.length;
    };
    DataObserver._promises = [];
    return DataObserver;
}());
exports.DataObserver = DataObserver;
