import yaml from 'js-yaml';

export interface CategoryNode {
    name: string;
    children?: CategoryNode[];
}

export function parseCategorySetting(raw: string | undefined): CategoryNode[] {
    if (!raw) return [];
    let parsed: unknown;
    try {
        parsed = yaml.load(raw);
    } catch {
        return [];
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed as Record<string, unknown>).map(([name, subs]) => {
        const node: CategoryNode = { name };
        if (Array.isArray(subs)) {
            const validSubs = subs.filter((s): s is string => typeof s === 'string' && !!s).map((s) => ({ name: s }));
            if (validSubs.length > 0) node.children = validSubs;
        }
        return node;
    });
}
