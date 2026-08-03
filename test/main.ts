import assert from 'assert';
import { writeFileSync } from 'fs';
import autocannon from 'autocannon';
import {
    after, before, describe, it,
} from 'node:test';
import * as supertest from 'supertest';

const Root = {
    username: 'root',
    password: '123456',
    creditionals: null,
};

describe('App', () => {
    let agent;
    before(async () => {
        const init = Date.now();
        await new Promise((resolve) => {
            process.send = ((send) => (data) => {
                console.log('send', data);
                if (data === 'ready') {
                    agent = supertest.agent(require('hydrooj').httpServer);
                    resolve(null);
                }
                return send?.(data) || false;
            })(process.send);
        });
        console.log('Application inited in %d ms', Date.now() - init);
    }, { timeout: 30000 });

    const routes = ['/', '/p', '/contest', '/homework', '/user/1', '/training'];
    for (const route of routes) {
        // eslint-disable-next-line ts/no-loop-func
        it(`GET ${route}`, () => agent.get(route).expect(200));
    }

    it('API user', async () => {
        await agent.get('/api/user?args={"id":1}&projection=uname').expect({ uname: 'Hydro' });
        await agent.get('/api/user?args={"id":2}&projection=uname').expect(null);
    });

    it('Create User', async () => {
        const redirect = await agent.post('/register')
            .send({ mail: 'test@example.com' })
            .expect(302)
            .then((res) => res.headers.location);
        await agent.post(redirect)
            .send({ uname: Root.username, password: Root.password, verifyPassword: Root.password })
            .expect(302);
    });

    it('Login', async () => {
        const cookie = await agent.post('/login')
            .send({ uname: Root.username, password: Root.password })
            .expect(302)
            .then((res) => res.headers['set-cookie']);
        Root.creditionals = cookie;
    });

    it('API registered user', async () => {
        await agent.get('/api/user?args={"id":2}&projection=uname').expect({ uname: 'root' });
    });

    it('ProblemSubmitHandler.get exposes language metadata for ui-next', async () => {
        const {
            ProblemModel, SettingModel, UserModel,
        } = require('hydrooj');
        await UserModel.setSuperAdmin(2);
        await ProblemModel.add(
            'system',
            'P1000',
            'A+B Problem',
            JSON.stringify({ en: 'A+B', zh: 'A+B' }),
            2,
            [],
        );

        const res = await agent.get('/p/P1000/submit')
            .set('accept', 'application/json')
            .expect(200);
        const body = typeof res.body === 'object' && res.body !== null
            ? res.body
            : JSON.parse(res.text);
        assert(body.langRange && typeof body.langRange === 'object');
        assert(body.langs && typeof body.langs === 'object', 'problem_submit response is missing langs');
        assert.strictEqual(body.langs.cc?.display, SettingModel.langs.cc.display);
        assert.strictEqual(body.langs.cc?.pretest, SettingModel.langs.cc.pretest);
        assert.strictEqual(body.langs['cc.cc17']?.display, SettingModel.langs['cc.cc17'].display);
    });

    describe('SP0: renderer gate regression', () => {
        it('GET / serves ui-next SPA shell', async () => {
            const res = await agent.get('/').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });

        it('GET /ranking serves ui-default nunjucks (not ui-next)', async () => {
            const res = await agent.get('/ranking').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(!res.text.includes('id="root"'));
        });

        it('registration POST returns verification code (not SPA shell)', async () => {
            const res = await agent.post('/register')
                .send({ mail: 'renderer-gate@example.com' });
            assert.strictEqual(res.status, 302);
            assert(!res.text.includes('id="root"'));
            assert.match(res.headers.location, /^\/register\/[\w-]+$/);
        });
    });

    describe('SP1 broken-pages e2e', () => {
        // SP1 closes the 4 H3 404 links surfaced in
        // `.claude/reviews/ui-next-migration-coverage-2026-07-27.md`.
        // Each migrated page must now serve the ui-next SPA shell
        // (no fallback to ui-default nunjucks).
        it('GET /p/:pid/solution returns ui-next shell (no fallback)', async () => {
            const res = await agent.get('/p/1/solution').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });

        it('GET /p/:pid/stat returns ui-next shell', async () => {
            const res = await agent.get('/p/1/stat').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });

        it('GET /user/:uid returns ui-next shell', async () => {
            const res = await agent.get('/user/1').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });

        it('GET /d/:did returns ui-next shell', async () => {
            const res = await agent.get('/d/1').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });
    });

    describe('SP2 discussion-domain e2e', () => {
        it('GET /discuss returns ui-next shell (main)', async () => {
            const res = await agent.get('/discuss').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });

        it('GET /discuss/node/<name> returns ui-next shell (node)', async () => {
            const res = await agent.get('/discuss/node/x').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });

        it('GET /d/1/edit returns ui-next shell (edit)', async () => {
            const res = await agent.get('/d/1/edit').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });

        it('GET /discuss/<type>/<name>/create returns ui-next shell (create)', async () => {
            const res = await agent.get('/discuss/node/x/create').set('Accept', 'text/html');
            assert.strictEqual(res.status, 200);
            assert(res.text.includes('id="root"'));
        });
    });

    describe('SP8 P1-3: ui_next boolean contract via /manage/setting', () => {
        // The handler used to persist ui_next as a normalized boolean via
        // system.set() but then re-broadcast the *raw* form args (containing
        // ui_next: 'true' as a string) from this.ctx.broadcast('system/setting', args).
        // The model:system listener overwrites the cache with that string, so
        // system.get('ui_next') returned 'true' until restart, breaking the
        // top-level boolean contract. We now drop the scalar ui_next key from
        // the raw form args before re-broadcasting. This suite locks that in.
        before(async () => {
            const { UserModel, SystemModel } = require('hydrooj');
            await UserModel.setSuperAdmin(2);
            // Establish sudo mode: GET triggers the @requireSudo redirect, and
            // POSTing the password to /user/sudo arms the session for one hour.
            await agent.get('/manage/setting').expect(302);
            await agent.post('/user/sudo').send({ password: '123456' }).expect(302);
            // First-touch baseline so this test does not depend on prior state.
            const baseline = SystemModel.get('ui_next');
            await SystemModel.set('ui_next', !!baseline);
        });

        it('POST ui_next="true" yields boolean true (not string)', async () => {
            const { SystemModel } = require('hydrooj');
            await agent.post('/manage/setting')
                .type('form')
                .send({ ui_next: 'true', 'booleanKeys.ui_next': 'true' })
                .expect(302);
            const cur = SystemModel.get('ui_next');
            assert.strictEqual(cur, true, `expected boolean true, got ${JSON.stringify(cur)}`);
            assert.strictEqual(typeof cur, 'boolean', 'ui_next must stay a boolean');
        });

        it('POST without ui_next yields boolean false (companion path)', async () => {
            const { SystemModel } = require('hydrooj');
            await agent.post('/manage/setting')
                .type('form')
                .send({ 'booleanKeys.ui_next': 'true' })
                .expect(302);
            const cur = SystemModel.get('ui_next');
            assert.strictEqual(cur, false, `expected boolean false, got ${JSON.stringify(cur)}`);
            assert.strictEqual(typeof cur, 'boolean', 'ui_next must stay a boolean');
        });
    });

    // TODO add more tests

    const results: Record<string, autocannon.Result> = {};
    if (process.env.BENCHMARK) {
        for (const route of routes) {
            it(`Performance test ${route}`, { timeout: 60000 }, async () => {
                const result = await autocannon({ url: `http://localhost:8888${route}` });
                assert(result.errors === 0, `test ${route} returns errors`);
                results[route] = result;
            });
        }
    }

    after(() => {
        if (process.env.BENCHMARK) {
            const metrics = Object.entries(results).map(([k, v]) => ({
                name: `Benchmark - ${k} - Req/sec`,
                unit: 'Req/sec',
                value: v.requests.average,
            }));
            writeFileSync('./benchmark.json', JSON.stringify(metrics, null, 2));
        }
        setTimeout(() => process.exit(0), 1000);
    });
});
