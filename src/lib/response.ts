import { NextResponse } from 'next/server';

function bigintReplacer(_key: string, value: any) {
    if (typeof value === 'bigint') return value.toString();
    return value;
}

export function jsonResponse(data: any, init?: ResponseInit) {
    try {
        const body = JSON.stringify(data, bigintReplacer);
        return new NextResponse(body, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers as any) } });
    } catch (err) {
        // fallback: return minimal error
        console.error('jsonResponse serialization error', err);
        return new NextResponse(JSON.stringify({ error: 'Serialization error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export default jsonResponse;
