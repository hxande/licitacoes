import { neon } from '@neondatabase/serverless';

function getSql() {
    const conn = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
    return neon(conn);
}

// sql can be used as a tagged template: sql`SELECT ... WHERE id = ${id}`
// or as a normal call: sql('SELECT ...', [params])
export const sql = (queryOrStrings: TemplateStringsArray | string, ...values: any[]) => {
    const client = getSql();
    if (Array.isArray(queryOrStrings) && (queryOrStrings as any).raw) {
        const strings = queryOrStrings as TemplateStringsArray;
        let text = '';
        const params: any[] = [];
        for (let i = 0; i < strings.length; i++) {
            text += strings[i];
            if (i < values.length) {
                params.push(values[i]);
                text += `$${params.length}`;
            }
        }
        return (client as any)(text, params);
    }

    // plain call: sql('SELECT ...', [params]) or sql('SELECT ...')
    const text = queryOrStrings as string;
    if (values.length === 1 && Array.isArray(values[0])) {
        return (client as any)(text, values[0]);
    }
    return (client as any)(text, values);
};

let _dbAvailable: boolean | null = null;
export async function isDbAvailable(): Promise<boolean> {
    if (_dbAvailable !== null) return _dbAvailable;
    try {
        const client = getSql();
        await (client as any)('SELECT 1');
        _dbAvailable = true;
    } catch (err) {
        _dbAvailable = false;
    }
    return _dbAvailable;
}
