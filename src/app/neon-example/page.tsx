import React from 'react';
import { neon } from '@neondatabase/serverless';

export default function Page() {
    async function create(formData: FormData) {
        'use server';
        const comment = formData.get('comment');
        if (!comment) return;
        const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
        await sql('INSERT INTO comments (comment) VALUES ($1)', [comment]);
    }

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">Neon Server Action example</h1>
            <form action={create} className="flex gap-2">
                <input name="comment" placeholder="write a comment" className="border p-2 flex-1" />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
            </form>
        </div>
    );
}
