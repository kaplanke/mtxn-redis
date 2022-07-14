# @multiple-transaction-manager/redis

> Redis context implementation for multiple-transaction-manager library. 

__Important Note:__ Redis transactions are __not__ executed immediately like relational DB transactions. Instead, redis piles up a set of functions, and execute all of them at the end of the transaction at once. Therefore it may not be possible to use the result function of the _RedisTask_ until the context is committed.

## API

### Classes

#### __RedisContext__

####  `constructor(txnMngr, client)`
-   `txnMngr`: _{MultiTxnMngr}_ The multiple transaction manager to to bind with the context.
-   `client`: _{RedisClientType}_ The Redis client.
-   Returns: {RedisContext} The created _RedisContext_ instance.

#### `addFunctionTask(execFunc)`

Adds a task to the transaction manager.

-   `execFunc`: _{ (client: RedisClientType, txn: RedisClientMultiCommandType, task: Task) => RedisClientMultiCommandType}_ The function to be executes in promise. Redis client and current MultiCommand are provided to the function.
-   Returns: {RedisTask} Returns the created _RedisTask_ instance.

#### __RedisTask__

####  `constructor(context, execFunc)`
-   `context`: _{RedisContext}_ The _RedisContext_ to to bind with the task.
-   `execFunc`: _{(client: RedisClientType, txn: RedisClientMultiCommandType, task: Task) => RedisClientMultiCommandType}_  The function to be executes in promise. Redis client and current MultiCommand are provided to the function.
-   Returns: {RedisTask} The created _RedisTask_ instance.

## Example

https://github.com/kaplanke/mtxn-redis/blob/master/test/mtxn.redis.test.ts

```js

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

```
