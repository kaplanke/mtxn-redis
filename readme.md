# @multiple-transaction-manager/redis

> Redis context implementation for multiple-transaction-manager library. 

Please refer to the test cases for a sample use case

https://github.com/kaplanke/mtxn-redis/blob/master/test/mtxn.redis.test.ts

__Important Note:__ Redis transactions are __not__ executed immediately like relational DB transactions. Instead, redis piles up a set of functions, and execute all of them at the end of the transaction at once. Therefore it may not be possible to use the result function of the _RedisTask_ until the context is committed.
