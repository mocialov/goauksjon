// Alternative Edge Function using SMTP directly (no external services needed)
// This version uses nodemailer for better compatibility
// Deploy this using: supabase functions deploy auction-notifications-smtp

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPreferences {
  selectedCategories: string[]
  selectedSellers: string[]
  mapBounds: {
    _southWest: { lat: number; lng: number }
    _northEast: { lat: number; lng: number }
  } | null
  minPrice: number | null
  maxPrice: number | null
  notificationFrequency: 'immediate' | 'hourly' | 'daily'
}

interface Auction {
  id: number
  item: string
  category: string
  seller: string
  location: string
  price?: number
  inserted_at: string
  url?: string
}

// SMTP Email sending function using nodemailer
async function sendEmailSMTP(to: string, subject: string, html: string) {
  console.log(`Sending email via SMTP to ${to}: ${subject}`)
  
  // Configure your SMTP settings here
  const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
  const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '587')
  const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME')
  const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD')
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@yourdomain.com'
  const FROM_NAME = Deno.env.get('FROM_NAME') || 'Auction Alerts'

  if (!SMTP_USERNAME || !SMTP_PASSWORD) {
    console.error('SMTP credentials not configured')
    return { success: false, error: 'SMTP not configured' }
  }

  console.log(`SMTP Config: ${SMTP_HOST}:${SMTP_PORT}, from: ${FROM_EMAIL}`)

  try {
    // Use nodemailer via npm: (requires npm: prefix in Deno)
    const nodemailer = await import('npm:nodemailer@6.9.7')
    
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
    })

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    })

    console.log('Email sent successfully via SMTP:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('SMTP sending error:', error)
    return { success: false, error: error.message }
  }
}

function matchesPreferences(auction: Auction, prefs: NotificationPreferences, coordinates: Record<string, [number, number]>): boolean {
  // Category filter
  if (prefs.selectedCategories && prefs.selectedCategories.length > 0) {
    const category = auction.category || ''
    let categoryMatch = false
    
    if (category.includes(':')) {
      const [parent, child] = category.split(':').map(s => s.trim())
      categoryMatch = prefs.selectedCategories.includes(parent) && prefs.selectedCategories.includes(child)
    } else {
      categoryMatch = prefs.selectedCategories.includes(category)
    }
    
    if (!categoryMatch) return false
  }

  // Seller filter
  if (prefs.selectedSellers && prefs.selectedSellers.length > 0) {
    const seller = auction.seller || ''
    const sellerCategory = mapSellerToCategory(seller)
    if (!prefs.selectedSellers.includes(sellerCategory)) return false
  }

  // Price filter
  if (prefs.minPrice !== null && auction.price && auction.price < prefs.minPrice) return false
  if (prefs.maxPrice !== null && auction.price && auction.price > prefs.maxPrice) return false

  // Location/map bounds filter
  if (prefs.mapBounds && auction.location) {
    const coord = coordinates[auction.location]
    if (!coord) return true // If we don't have coordinates, don't filter it out
    
    const [lat, lng] = coord
    const sw = prefs.mapBounds._southWest
    const ne = prefs.mapBounds._northEast
    
    const inBounds = lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng
    if (!inBounds) return false
  }

  return true
}

function mapSellerToCategory(seller: string): string {
  if (!seller) return 'Other/Unknown Seller'
  const s = seller.toLowerCase()
  if (s.includes('as') || s.includes('ab') || s.includes('asa') || s.includes('ltd') || s.includes('inc')) {
    return 'Sold by Company'
  }
  if (s.includes('auksjonen.no')) return 'Auksjonen.no'
  if (s.includes('konkursbo') || s.includes('konkurs')) return 'Konkursbo'
  if (/^[a-zA-ZæøåÆØÅ\s]+$/.test(seller)) return 'Individual Seller'
  return 'Other/Unknown Seller'
}

function generateEmailHTML(auctions: Auction[]): string {
  const auctionItems = auctions.map(a => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px;">
        <strong>${a.item || 'Unknown Item'}</strong><br/>
        <small style="color: #6b7280;">${a.category || 'N/A'}</small>
      </td>
      <td style="padding: 12px;">${a.seller || 'Unknown'}</td>
      <td style="padding: 12px;">${a.location || 'N/A'}</td>
      <td style="padding: 12px;">${a.price ? `${a.price} NOK` : 'N/A'}</td>
      <td style="padding: 12px;">
        ${a.url ? `<a href="${a.url}" style="color: #3b82f6; text-decoration: none;">View</a>` : 'N/A'}
      </td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; }
        table { width: 100%; border-collapse: collapse; background-color: white; }
        th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔔 New Auction Alerts</h1>
          <p style="margin: 10px 0 0 0;">You have ${auctions.length} new auction${auctions.length > 1 ? 's' : ''} matching your preferences</p>
        </div>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Seller</th>
                <th>Location</th>
                <th>Price</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              ${auctionItems}
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            You're receiving this email because you've enabled auction notifications.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body (triggered by database webhook or scheduled job)
    const { auction, type = 'immediate' } = await req.json()

    if (!auction) {
      return new Response(
        JSON.stringify({ error: 'No auction data provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch all enabled notification preferences
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('user_notification_preferences')
      .select('*')
      .eq('enabled', true)

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch preferences' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active notification preferences found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // For this example, we'll need coordinates - in production, cache these
    const coordinates: Record<string, [number, number]> = {}
    
    // Process each user's preferences
    const notifications = []
    
    for (const userPref of preferences) {
      const prefs: NotificationPreferences = userPref.preferences

      // Check if auction matches user's criteria
      if (matchesPreferences(auction, prefs, coordinates)) {
        // Check if we've already sent this notification
        const { data: existing } = await supabaseClient
          .from('notification_log')
          .select('id')
          .eq('email', userPref.email)
          .eq('auction_id', auction.id)
          .single()

        if (!existing) {
          // Send email via SMTP
          const emailResult = await sendEmailSMTP(
            userPref.email,
            `New Auction Match: ${auction.item}`,
            generateEmailHTML([auction])
          )

          if (emailResult.success) {
            // Log the notification
            await supabaseClient
              .from('notification_log')
              .insert({
                email: userPref.email,
                auction_id: auction.id,
                notification_type: type
              })

            notifications.push({
              email: userPref.email,
              status: 'sent'
            })
          } else {
            notifications.push({
              email: userPref.email,
              status: 'failed',
              error: emailResult.error
            })
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${notifications.length} notifications`,
        notifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
