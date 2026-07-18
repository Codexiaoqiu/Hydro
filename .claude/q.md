18 15:16:27   server [E] User: 2(小邱) get: /d/system/p/5 domainId.toLowerCase is not a function undefined
18 15:16:27   server [E] TypeError: domainId.toLowerCase is not a function
                             at _DomainModel.get (/home/xq/Hydro/packages/hydrooj/src/model/domain.ts:81:29)
                             at ProblemModel.get (/home/xq/Hydro/packages/hydrooj/src/model/problem.ts:198:40)
                             at ProblemDetailHandler._prepare (/home/xq/Hydro/packages/hydrooj/src/handler/problem.ts:304:35)
                             at Proxy.handleHttp (/home/xq/Hydro/framework/framework/server.ts:593:79)
                             at processTicksAndRejections (node:internal/process/task_queues:104:5)
                             at user_default (/home/xq/Hydro/packages/hydrooj/src/service/layers/user.ts:20:5)
                             at base_default (/home/xq/Hydro/packages/hydrooj/src/service/layers/base.ts:48:5)
                             at /home/xq/Hydro/packages/hydrooj/src/service/server.ts:99:17
                             at /home/xq/Hydro/framework/framework/base.ts:55:9
                             at domain_default (/home/xq/Hydro/packages/hydrooj/src/service/layers/domain.ts:33:9)
                             at /home/xq/Hydro/node_modules/koa-static-cache/index.js:53:36
                             at /home/xq/Hydro/node_modules/koa-static-cache/index.js:53:36
                             at /home/xq/Hydro/framework/framework/server.ts:456:21
                             at /home/xq/Hydro/framework/framework/server.ts:427:21
                             at /home/xq/Hydro/framework/framework/server.ts:421:20
                             at compressMiddleware (/home/xq/Hydro/node_modules/koa-compress/lib/index.js:93:5)
18 15:16:27   server [D] GET /system/p/5 500 17ms 8195