import { NextResponse } from 'next/server';

const SECRET = process.env.MIGRATE_SECRET;

export async function POST(req: Request) {
    const header = req.headers.get('x-migrate-secret');
    if (!SECRET || header !== SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Migration error:', err);
        return NextResponse.json({ error: 'Migration failed', details: String(err) }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ info: 'POST with header x-migrate-secret to run migrations' });
}
