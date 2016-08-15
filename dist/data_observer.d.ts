import { MeteorCallbacks } from './utils';
export interface PromiseCompleter<R> {
    promise: Promise<R>;
    resolve: (value?: R | PromiseLike<R>) => void;
    reject: (error?: any, stackTrace?: string) => void;
}
export declare class PromiseWrapper {
    static resolve<T>(obj: T): Promise<T>;
    static reject(obj: any, _: any): Promise<any>;
    static catchError<T>(promise: Promise<T>, onError: (error: any) => T | PromiseLike<T>): Promise<T>;
    static all(promises: any[]): Promise<any>;
    static then<T, U>(promise: Promise<T>, success: (value: T) => U | PromiseLike<U>, rejection?: (error: any, stack?: any) => U | PromiseLike<U>): Promise<U>;
    static wrap<T>(computation: () => T): Promise<T>;
    static scheduleMicrotask(computation: () => any): void;
    static isPromise(obj: any): boolean;
    static completer(): PromiseCompleter<any>;
}
/**
 * A helper class for data loading events.
 * For example, used in @MeteorComponent to wrap callbacks
 * of the Meteor methods whic allows us to know when
 * requested data is available on the client.
 */
export declare class DataObserver {
    private static _promises;
    static pushCb(callbacks: MeteorCallbacks): MeteorCallbacks;
    static onSubsReady(cb: Function): void;
    static onReady(cb: Function): void;
    static cbLen(): number;
}
