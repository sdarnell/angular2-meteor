'use strict';

import {
  CallbacksObject,
  MeteorCallbacks,
  isMeteorCallbacks,
  isCallbacksObject,
  check,
  Match
} from './utils';

export interface PromiseCompleter<R> {
  promise: Promise<R>;
  resolve: (value?: R | PromiseLike<R>) => void;
  reject: (error?: any, stackTrace?: string) => void;
}

export class PromiseWrapper {
  static resolve<T>(obj: T): Promise<T> { return Promise.resolve(obj); }

  static reject(obj: any, _): Promise<any> { return Promise.reject(obj); }

  // Note: We can't rename this method into `catch`, as this is not a valid
  // method name in Dart.
  static catchError<T>(promise: Promise<T>,
                       onError: (error: any) => T | PromiseLike<T>): Promise<T> {
    return promise.catch(onError);
  }

  static all(promises: any[]): Promise<any> {
    if (promises.length == 0) return Promise.resolve([]);
    return Promise.all(promises);
  }

  static then<T, U>(promise: Promise<T>, success: (value: T) => U | PromiseLike<U>,
                    rejection?: (error: any, stack?: any) => U | PromiseLike<U>): Promise<U> {
    return promise.then(success, rejection);
  }

  static wrap<T>(computation: () => T): Promise<T> {
    return new Promise((res, rej) => {
      try {
        res(computation());
      } catch (e) {
        rej(e);
      }
    });
  }

  static scheduleMicrotask(computation: () => any): void {
    PromiseWrapper.then(PromiseWrapper.resolve(null), computation, (_) => {});
  }

  static isPromise(obj: any): boolean { return obj instanceof Promise; }

  static completer(): PromiseCompleter<any> {
    var resolve;
    var reject;

    var p = new Promise(function(res, rej) {
      resolve = res;
      reject = rej;
    });

    return {promise: p, resolve: resolve, reject: reject};
  }
}

/**
 * A helper class for data loading events. 
 * For example, used in @MeteorComponent to wrap callbacks
 * of the Meteor methods whic allows us to know when
 * requested data is available on the client.
 */
export class DataObserver {
  private static _promises: Array<Promise<any>> = [];

  static pushCb(callbacks: MeteorCallbacks): MeteorCallbacks {
    check(callbacks, Match.Where(isMeteorCallbacks));

    const completer: PromiseCompleter<any> = PromiseWrapper.completer();
    const dequeue = (promise) => {
      let index = this._promises.indexOf(promise);
      if (index !== -1) {
        this._promises.splice(index, 1);
      }
    };
    const queue = (promise) => {
      this._promises.push(promise);
    };

    const promise = completer.promise;
    if (isCallbacksObject(callbacks)) {
      let origin = <CallbacksObject>callbacks;
      let object = <CallbacksObject>{
        onError: (err) => {
          if (origin.onError) {
            origin.onError(err);
          }
          completer.resolve({ err });
          dequeue(promise);
        },

        onReady: (result) => {
          if (origin.onReady) {
            origin.onReady(result);
          }
          completer.resolve({ result });
          dequeue(promise);
        },

        onStop: (err) => {
          if (origin.onStop) {
            origin.onStop(err);
          }
          completer.resolve({ err });
          dequeue(promise);
        }
      };

      queue(promise);

      return object;
    }

    let newCallback = (err, result) => {
      (<Function>callbacks)(err, result);
      completer.resolve({ err, result });
      dequeue(promise);
    };

    queue(promise);

    return newCallback;
  }

  static onSubsReady(cb: Function): void {
    check(cb, Function);

    new Promise((resolve, reject) => {
      const poll = Meteor.setInterval(() => {
        if (DDP._allSubscriptionsReady()) {
          Meteor.clearInterval(poll);
          resolve();
        }
      }, 100);
    }).then(() => cb());
  }

  static onReady(cb: Function): void {
    check(cb, Function);

    Promise.all(this._promises).then(() => cb());
  }

  static cbLen(): number {
    return this._promises.length;
  }
}
