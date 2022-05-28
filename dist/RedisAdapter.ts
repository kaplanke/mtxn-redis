import { createClient } from "redis";
import log4js from "log4js";
import { Context, MultiTxnMngr, Task } from "multiple-transaction-manager";
import { v1 } from "uuid";

const redisClient = createClient();
type RedisClientMultiCommandType = ReturnType<typeof redisClient.multi>;
type RedisClientType = ReturnType<typeof createClient>;

class RedisContext implements Context {

    client: RedisClientType;
    txn: RedisClientMultiCommandType | undefined = undefined;
    contextId: string;
    logger = log4js.getLogger("MultiTxnMngr");

    constructor(client: RedisClientType) {
        this.client = client;
        this.contextId = v1();
    }

    init(): Promise<Context> {
        return new Promise((resolve, reject) => {
            if (this.isInitialized()) {
                reject("Context already initialised.");
            } else {
                this.txn = this.client.multi();
                resolve(this);
            }
        });
    }

    commit(txnMngr: MultiTxnMngr): Promise<Context> {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) {
                reject("Cannot commit. Context not initialised.");
            } else {
                this.txn?.exec().then(ret => {
                    this.txn = undefined;
                    ret.forEach((dat, idx) => (txnMngr.tasks[idx] as RedisTask).setResult(dat));
                    resolve(this)
                }).catch((err) => {
                    reject(err);
                })
            }
        });
    }

    rollback(): Promise<Context> {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) {
                reject("Cannot rollback. Context not initialised.");
            } else {
                try {
                    type RedisClientMultiCommandType = ReturnType<typeof this.client.multi>;
                    this.txn?.discard();
                    this.txn = undefined;
                    resolve(this)
                } catch (err) {
                    reject(err);
                }
            }
        });
    }

    isInitialized(): boolean {
        return this.txn != undefined;
    }

    getName(): string {
        return "Redis Context: " + this.contextId;
    }

    getTransaction(): RedisClientMultiCommandType {
        if (!this.txn)
            throw new Error("Transaction not initialised!");
        return this.txn;
    }

    addFunctionTask(txnMngr: MultiTxnMngr,
        execFunc: (client: RedisClientType, txn: RedisClientMultiCommandType, task: Task) => RedisClientMultiCommandType) {
        const task = new RedisTask(this, execFunc);
        txnMngr.addTask(task);
    }
}

class RedisTask implements Task {

    context: RedisContext;
    rs: any | undefined;
    execFunc: (client: RedisClientType, txn: RedisClientMultiCommandType, task: Task) => RedisClientMultiCommandType;

    constructor(context: RedisContext,
        execFunc: (client: RedisClientType, txn: RedisClientMultiCommandType, task: Task) => RedisClientMultiCommandType) {
        this.context = context;
        this.execFunc = execFunc;
    }

    getContext(): RedisContext {
        return this.context;
    }

    exec(): Promise<Task> {
        return new Promise<Task>((resolveTask, rejectTask) => {
            try {
                let res: any = this.execFunc(this.getContext().client, this.getContext().getTransaction(), this);
                if ((res as RedisClientMultiCommandType).exec)
                    this.getContext().txn = res;
                else
                    this.rs = res;
                resolveTask(this);
            } catch (err) {
                rejectTask(err);
            }
        });
    }

    getResult(): any | undefined {
        return this.rs;
    }

    setResult(res: any) {
        this.rs = res;
    }

    params: any;
    setParams(params: object) {
        throw new Error("Method not implemented.");
    }
}

export { RedisContext, RedisTask };
