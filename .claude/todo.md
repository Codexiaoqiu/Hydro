ragflow@DESKTOP-AI4FF71:/home/Hydro$   yarn debug 2>&1 | tee /tmp/hydro.log
Debug mode enabled
Process 53310 running as master
17 23:48:09   loader [D] { args: [], options: { '--': [], debug: true, template: true } }
Using mongodb external event bus
17 23:48:09   common [I] Locale init: /home/Hydro/packages/hydrooj
17 23:48:09   common [I] Locale init: /home/Hydro/packages/ui-default
17 23:48:09   common [I] Locale init: /home/Hydro/packages/hydrojudge
17 23:48:09 settings [I] Successfully loaded config
17 23:48:09   loader [I] apply plugin packages/hydrooj/src/service/worker.ts with scope worker
17 23:48:09   loader [I] apply plugin packages/hydrooj/src/service/server.ts with scope server
17 23:48:09   server [D] Using upload dir: /tmp/hydro/upload/0
17 23:48:09 settings [D] Loading config { file?: { type?: "file" | "s3", endPointForUser?: string, endPointForJudge?: string } & ({ type?: "file", path?: string, secret?: string } | { type: "s3", endPoint?: string, accessKey?: string, secretKey?: string, bucket?: string, region?: string, pathStyle?: boolean }) }
17 23:48:09   loader [I] apply plugin packages/hydrooj/src/service/storage.ts with scope file
17 23:48:09  storage [D] Loading local storage service with path: /data/file/hydro
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/blacklist.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/contest.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/discussion.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/document.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/domain.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/message.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/oauth.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/opcount.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/problem.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/record.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/schedule.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/setting.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/solution.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/storage.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/task.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/token.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/model/user.ts 
17 23:48:10model/setting [I] Ensuring settings
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/compat.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/connection.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/contest.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/discussion.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/domain.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/home.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/homework.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/import.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/judge.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/manage.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/misc.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/problem.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/record.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/status.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/training.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/handler/user.ts 
17 23:48:10   server [W] HandlerCommon.prototype[url] already exists.
17 23:48:10   server [W] HandlerCommon.prototype[translate] already exists.
17 23:48:10   server [W] HandlerCommon.prototype[checkPerm] already exists.
17 23:48:10   server [W] HandlerCommon.prototype[checkPriv] already exists.
17 23:48:10   server [W] Handler.prototype[onerror] already exists.
17 23:48:10   server [W] ConnectionHandler.prototype[onerror] already exists.
17 23:48:10model/task [I] No replica set found.
17 23:48:10   loader [I] apply plugin packages/ui-next/index.ts with scope ui-next
17 23:48:10 settings [D] Loading config { ui-default?: { serviceWorker?: { preload?: string, assets?: string[], domains?: string[] } } }
17 23:48:10   loader [I] apply plugin packages/ui-default/index.ts with scope ui-default
17 23:48:10 settings [D] Loading config { hydrojudge?: { cache_dir?: string, tmp_dir?: string, stdio_size?: string, memoryMax?: string, strict_memory?: boolean, sandbox_host?: string, testcases_max?: number, total_time_limit?: number, processLimit?: number, parallelism?: number, concurrency?: number, singleTaskParallelism?: number, rerun?: number, rate?: number, env?: string, host?: any, secret?: string, disable?: boolean, tracing?: { endpoint?: string, samplePercentage?: number }, pipe_proxy?: boolean, detail?: "full" | "case" | "none" | boolean | "full" | "none" | "case", performance?: boolean } }
17 23:48:10   loader [I] apply plugin packages/hydrojudge/index.js with scope hydrojudge
Error: module require via hydrooj/src/model/setting is deprecated.
    at Object.<anonymous> (/home/Hydro/packages/hydrojudge/src/hosts/builtin.ts:10:23)
    at new apply (/home/Hydro/packages/hydrojudge/src/index.ts:10:33)
    at Object.execute (file:///home/Hydro/node_modules/cordis/lib/index.js:449:30)
    at file:///home/Hydro/node_modules/cordis/lib/index.js:544:29
    at composeError (file:///home/Hydro/node_modules/cordis/lib/index.js:234:20)
    at Fiber._execute (file:///home/Hydro/node_modules/cordis/lib/index.js:536:12)
    at Fiber._reload (file:///home/Hydro/node_modules/cordis/lib/index.js:699:18)
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/script/blacklist.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/script/checkUpdate.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/script/deleteUser.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/script/fixStorage.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/script/problemStat.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/script/rating.ts 
17 23:48:10   loader [I] apply plugin packages/hydrooj/src/script/storageUsage.ts 
17 23:48:10       ui [I] + lang-en.js-95cc47: 5.2 KiB
17 23:48:10       ui [I] + lang-ko.js-b144b6: 28.9 KiB
17 23:48:10       ui [I] + lang-zh.js-a01957: 46.5 KiB
17 23:48:10       ui [I] + lang-zh_TW.js-bc05db: 46.7 KiB
17 23:48:10       ui [I] + entry.js-864e29: 237 Bytes
17 23:48:10       ui [S] UI addons built in 80 ms (127.5 KiB)
WebSocket server error: Port 3010 is already in use
17 23:48:10   server [S] Server listening at: 127.0.0.1:8888
17 23:48:10   worker [S] Server started
17 23:48:10 template [I] Template init: /home/Hydro/packages/ui-default
17 23:48:12       ui [I] + lang-en.js-95cc47: 5.2 KiB
17 23:48:12       ui [I] + lang-ko.js-b144b6: 28.9 KiB
17 23:48:12       ui [I] + lang-zh.js-a01957: 46.5 KiB
17 23:48:12       ui [I] + lang-zh_TW.js-bc05db: 46.7 KiB
17 23:48:12       ui [I] + entry.js-4a700a: 11.7 KiB
17 23:48:12       ui [S] UI addons built in 8 ms (139 KiB)