import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WINDOW_MIN = 10

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization')
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader || '' } } }
    )
    const { data: { user } } = await anon.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { post_id, liker_profile_id } = await req.json()
    if (!post_id || !liker_profile_id) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (liker_profile_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find post author
    const { data: post } = await admin
      .from('posts')
      .select('id, profile_id')
      .eq('id', post_id)
      .single()

    if (!post) {
      return new Response(JSON.stringify({ skipped: 'no_post' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (post.profile_id === liker_profile_id) {
      return new Response(JSON.stringify({ skipped: 'self_like' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check author preference
    const { data: authorProfile } = await admin
      .from('profiles')
      .select('notify_likes, full_name')
      .eq('id', post.profile_id)
      .single()

    if (!authorProfile || authorProfile.notify_likes === false) {
      return new Response(JSON.stringify({ skipped: 'opt_out' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Anti-spam: check log within window
    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString()
    const messageKey = `like:${post.id}`
    const { count: existing } = await admin
      .from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', post.profile_id)
      .eq('message_key', messageKey)
      .gte('sent_at', since)

    if ((existing || 0) > 0) {
      return new Response(JSON.stringify({ skipped: 'rate_limited' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get liker name
    const { data: liker } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', liker_profile_id)
      .single()

    const likerName = (liker?.full_name || 'Alguém').split(' ')[0]

    // Send push directly via send-push (with bypass)
    const sendRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        profile_id: post.profile_id,
        title: 'Fábrica de Leoas 🦁',
        body: `${likerName} curtiu seu post 🦁`,
        message_key: messageKey,
        url: `/feed?post=${post.id}`,
        bypass_limit: true,
      }),
    })

    const result = await sendRes.json()
    return new Response(JSON.stringify({ ok: true, push: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-like error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
