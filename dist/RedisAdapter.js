"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisTask = exports.RedisContext = void 0;
const redis_1 = require("redis");
const log4js_1 = __importDefault(require("log4js"));
const uuid_1 = require("uuid");
const redisClient = (0, redis_1.createClient)();
class RedisContext {
    constructor(client) {
        this.txn = undefined;
        this.logger = log4js_1.default.getLogger("MultiTxnMngr");
        this.client = client;
        this.contextId = (0, uuid_1.v1)();
    }
    init() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized()) {
                reject("Context already initialised.");
            }
            else {
                this.txn = this.client.multi();
                resolve(this);
            }
        });
    }
    commit(txnMngr) {
        return new Promise((resolve, reject) => {
            var _a;
            if (!this.isInitialized()) {
                reject("Cannot commit. Context not initialised.");
            }
            else {
                (_a = this.txn) === null || _a === void 0 ? void 0 : _a.exec().then(ret => {
                    this.txn = undefined;
                    ret.forEach((dat, idx) => txnMngr.tasks[idx].setResult(dat));
                    resolve(this);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }
    rollback() {
        return new Promise((resolve, reject) => {
            var _a;
            if (!this.isInitialized()) {
                reject("Cannot rollback. Context not initialised.");
            }
            else {
                try {
                    (_a = this.txn) === null || _a === void 0 ? void 0 : _a.discard();
                    this.txn = undefined;
                    resolve(this);
                }
                catch (err) {
                    reject(err);
                }
            }
        });
    }
    isInitialized() {
        return this.txn != undefined;
    }
    getName() {
        return "Redis Context: " + this.contextId;
    }
    getTransaction() {
        if (!this.txn)
            throw new Error("Transaction not initialised!");
        return this.txn;
    }
    addFunctionTask(txnMngr, execFunc) {
        const task = new RedisTask(this, execFunc);
        txnMngr.addTask(task);
    }
}
exports.RedisContext = RedisContext;
class RedisTask {
    constructor(context, execFunc) {
        this.context = context;
        this.execFunc = execFunc;
    }
    getContext() {
        return this.context;
    }
    exec() {
        return new Promise((resolveTask, rejectTask) => {
            try {
                let res = this.execFunc(this.getContext().client, this.getContext().getTransaction(), this);
                if (res.exec)
                    this.getContext().txn = res;
                else
                    this.rs = res;
                resolveTask(this);
            }
            catch (err) {
                rejectTask(err);
            }
        });
    }
    getResult() {
        return this.rs;
    }
    setResult(res) {
        this.rs = res;
    }
    setParams(params) {
        throw new Error("Method not implemented.");
    }
}
exports.RedisTask = RedisTask;
