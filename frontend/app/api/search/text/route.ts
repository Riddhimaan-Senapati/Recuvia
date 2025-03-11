// app/api/search/text/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query, filters } = await req.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data, error } = await supabase
      .from('items')
      .select('*, item_images(*), profiles:user_id(email)')
      .textSearch('title', query, { type: 'websearch' })
      .eq('type', filters?.type || 'found');
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error('Error searching by text:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
