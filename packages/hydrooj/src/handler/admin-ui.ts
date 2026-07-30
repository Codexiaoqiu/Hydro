import { Types } from '@hydrooj/framework';
import type { Context } from '../context';
import { PRIV } from '../model/builtin';
import system from '../model/system';
import { Handler, param } from '../service/server';

export class AdminUiHandler extends Handler {
    @param('next', Types.Boolean)
    async post({ _domainId }: { domainId: string }, next: boolean) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        await system.set('ui_next', next);
        this.back();
    }
}

// The POST /admin/ui route is registered by manage.ts's apply() to keep
// all "/manage"-style routes co-located. This empty apply() exists so cordis
// treats this module as a valid plugin (loader.ts calls reloadPlugin on every
// handler/*.ts file; without a callable apply it throws
// "invalid plugin, expect function or object with an 'apply' method").
// eslint-disable-next-line ts/no-empty-function
export async function apply(_ctx: Context) {}
