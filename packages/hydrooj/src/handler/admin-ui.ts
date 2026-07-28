import { Types } from '@hydrooj/framework';
import { PRIV } from '../model/builtin';
import system from '../model/system';
import { Handler, param } from '../service/server';

export class AdminUiHandler extends Handler {
    @param('next', Types.Boolean)
    async post({ domainId }: { domainId: string }, next: boolean) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        await system.set('ui_next', next);
        this.back();
    }
}
