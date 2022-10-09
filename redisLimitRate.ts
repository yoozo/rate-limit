import * as child from 'child_process';
import Redis from "ioredis";
const redis = new Redis();


/** 检查任务限制 */
async function redisLimitRate(unionKey: string, limitTimeout: number, limitNum: number, limitVersion: number = 0) {
    const limitKey = `LimitRate:v${limitVersion}:${unionKey}`;

    // 保证初始值limitNum只有第一个可以写入成功
    await redis.set(limitKey, limitNum, "EX", limitTimeout, "NX");

    const allowNum = await redis.decr(limitKey);
    if (allowNum < 0) {
        if (await redis.ttl(limitKey) === -1) {
            // 如果key 没设置超时时间，添加超时时间
            await redis.expire(limitKey, limitTimeout);
        }
        return false;
    }
    return true
}


// main 测试用例
; (async () => {
    if (process.send === undefined) {
        for (let i = 0; i < 4; i++) {
            console.log('fork pid: ', (child.fork('./aa.ts')).pid)
        }
    } else {
        console.log('started from fork()', process.pid);
        // 一秒一次循环执行
        let i = 0;
        setInterval(async () => {
            console.log('pid: ', process.pid, ', i: ', i++)
            for (let num = 0; num < 100; num++) {
                if (!await redisLimitRate('test-limit', 5, 500)) {
                    console.log('被限流了', i, num)
                    break
                }
            }
        }, 1000)
    }
})();
