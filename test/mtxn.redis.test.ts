import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import log4js from "log4js";
import { MultiTxnMngr, Task } from "multiple-transaction-manager";
import { createClient } from "redis";
import RedisMemoryServer from "redis-memory-server";
import { RedisContext } from "../src/index";

log4js.configure({
    appenders: { 'out': { type: 'stdout' } },
    categories: { default: { appenders: ['out'], level: 'debug' } }
});

let host: string;
let port: number;
const redisServer = new RedisMemoryServer();

describe("Multiple transaction manager Redis workflow test...", () => {

    beforeAll(async () => {
        global.console = require('console');
        host = await redisServer.getHost();
        port = await redisServer.getPort();
    });


    test("Function task example", async () => {

        const client = createClient({ url: "redis://" + host + ":" + port });
        await client.connect();

        // init manager & context
        const txnMngr: MultiTxnMngr = new MultiTxnMngr();
        const redisContext = new RedisContext(txnMngr, client);

        // Add first step
        redisContext.addFunctionTask((_client, txn, _task) => txn.set("theKey1", "theValue1"));

        // Add second step
        redisContext.addFunctionTask((_client, txn, _task) => txn.set("theKey2", "theValue2"));

        // Add control step
        const controlTask: Task = redisContext.addFunctionTask((_client, txn, _task) => txn.keys("*"));

        await txnMngr.exec();

        expect(controlTask.getResult().length).toEqual(2);

        await client.disconnect();

    });


    afterAll(async () => { await redisServer.stop() });


});