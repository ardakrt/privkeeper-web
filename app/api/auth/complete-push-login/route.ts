import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { requestId, email, origin } = body;

    // Validate input
    if (!requestId || !email) {
      return NextResponse.json(
        { error: 'Missing requestId or email' },
        { status: 400 }
      );
    }

    console.log('🔐 Complete push login request:', { requestId, email });

    // Step 1: Verify the login request status
    const { data: loginRequest, error: fetchError } = await supabaseAdmin
      .from('login_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching login request:', fetchError);
      return NextResponse.json(
        { error: 'Login request not found' },
        { status: 404 }
      );
    }

    // Step 2: Security check - verify status is approved
    if (loginRequest.status !== 'approved') {
      console.error('❌ Login request not approved:', loginRequest.status);
      return NextResponse.json(
        { error: 'Login request not approved' },
        { status: 403 }
      );
    }

    console.log('✅ Login request verified as approved');

    // Determine redirect URL with robust fallback
    let redirectBase = origin;
    
    if (!redirectBase || redirectBase === 'null' || redirectBase === 'undefined') {
      redirectBase = process.env.NEXT_PUBLIC_SITE_URL;
      
      if (!redirectBase && process.env.NEXT_PUBLIC_VERCEL_URL) {
        redirectBase = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
      }
      
      if (!redirectBase) {
        redirectBase = 'http://localhost:3000';
      }
    }

    // Ensure protocol
    if (!redirectBase.startsWith('http')) {
      redirectBase = `https://${redirectBase}`;
    }
    
    // Remove trailing slash
    if (redirectBase.endsWith('/')) {
      redirectBase = redirectBase.slice(0, -1);
    }

    console.log('🔗 Using redirect base:', redirectBase);
    const redirectTo = `${redirectBase}/auth/callback`;

    // Step 3: Generate magic link using Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectTo,
      },
    });

    if (linkError) {
      console.error('❌ Error generating magic link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate login link' },
        { status: 500 }
      );
    }

    console.log('✅ Magic link generated successfully');

    // Step 4: Mark the login request as completed
    await supabaseAdmin
      .from('login_requests')
      .update({ status: 'completed' })
      .eq('id', requestId);

    // Step 5: Return the action link
    return NextResponse.json({
      url: linkData.properties.action_link,
      success: true,
    });

  } catch (error: any) {
    console.error('💥 Exception in complete-push-login:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
