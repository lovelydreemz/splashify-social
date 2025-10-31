# Splashify Social - Setup Guide

## Overview
Splashify Social is an automated social media posting app that generates AI-powered content and posts it to Threads on a schedule.

## Features
- 🤖 AI-powered post generation using Lovable AI (Google Gemini)
- 📅 Flexible scheduling (minutes, hours, days)
- 🌍 Multi-language support
- 📝 Template management
- 📊 Post history tracking
- 🔐 Secure credential storage

## Getting Started

### 1. Sign Up
1. Navigate to the app
2. Click "Get Started" or "Sign In"
3. Create an account with your email and password
4. You'll be automatically signed in

### 2. Configure Threads API Credentials

To post to Threads, you need to set up Threads API access:

#### Getting Threads API Credentials
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or select an existing one
3. Add the Threads API product to your app
4. Get your credentials:
   - **App ID**: Found in your app settings
   - **Access Token**: Generate a user access token with `threads_basic` and `threads_content_publish` permissions
   - **App Secret**: Found in your app settings

#### Adding Credentials to App
1. In Splashify Social, go to the "Settings" tab
2. Enter your:
   - Threads App ID
   - Access Token
   - App Secret
3. Click "Save Settings"

### 3. Create Post Templates

Templates define the base content that AI will use to generate posts:

1. Go to the "Templates" tab
2. Fill in:
   - **Title**: A name for your template (e.g., "Morning Motivation")
   - **Comment/Prompt**: The base topic or idea (e.g., "Share an inspiring quote about success")
   - **Language**: Select the language for generated posts
3. Click "Create Template"

### 4. Schedule Posts

1. Go to the "Schedule" tab
2. Select a template from the dropdown
3. Set your posting interval:
   - **Interval**: How often to post (e.g., 1, 2, 4)
   - **Unit**: Time unit (minutes, hours, days)
4. Click "Schedule Posts"

The system will:
- Generate AI-powered content based on your template
- Post to Threads at the scheduled intervals
- Continue automatically until you pause or delete the schedule

### 5. View Post History

1. Go to the "History" tab
2. See all your posted content with:
   - Post content
   - Timestamp
   - Success/failure status
   - Threads post ID

## Automated Processing

To enable automatic posting at scheduled times, you need to set up a cron job to trigger the processing function.

### Setting Up Cron Job (Recommended: Every 5 Minutes)

You can set this up using Supabase's pg_cron extension. Run this SQL in your Supabase SQL editor:

\`\`\`sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the process-scheduled-posts function to run every 5 minutes
SELECT cron.schedule(
  'process-scheduled-posts',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url:='https://yirbjyysvwnqoquelhcm.supabase.co/functions/v1/process-scheduled-posts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcmJqeXlzdnducW9xdWVsaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTA0NjcsImV4cCI6MjA3NzE2NjQ2N30.6XW86x8xZRdw5zCrc8h3WpUveiVm8yiJ4DQUmIEQYvQ"}'::jsonb
    ) as request_id;
  $$
);
\`\`\`

### Alternative: Manual Testing

You can manually trigger post processing by calling the edge function:

\`\`\`bash
curl -X POST https://yirbjyysvwnqoquelhcm.supabase.co/functions/v1/process-scheduled-posts \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcmJqeXlzdnducW9xdWVsaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTA0NjcsImV4cCI6MjA3NzE2NjQ2N30.6XW86x8xZRdw5zCrc8h3WpUveiVm8yiJ4DQUmIEQYvQ" \\
  -H "Content-Type: application/json"
\`\`\`

## Tips for Best Results

### AI Content Generation
- Be specific in your template comments
- Use clear, actionable prompts
- Test different phrasings to see what generates the best content
- Select the appropriate language for your target audience

### Scheduling Strategy
- Start with longer intervals (e.g., every 6 hours) to avoid rate limits
- Monitor the History tab to see what's working
- Adjust templates based on successful posts
- Use different templates for different time periods

### Threads API Best Practices
- Keep your access token secure
- Monitor your Threads API usage limits
- Regenerate tokens if they expire
- Test with a few posts before scheduling many

## Troubleshooting

### Posts Not Generating
- Check that you have Threads credentials configured
- Verify your template has valid content
- Check the History tab for error messages

### Authentication Issues
- Make sure you're signed in
- Check that your Threads access token is valid
- Verify all three credentials are entered correctly

### Scheduling Not Working
- Ensure the cron job is set up and running
- Check that your schedule status is "active"
- Verify the next post time is in the future

## Architecture

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Supabase for authentication and database

### Backend
- Supabase Edge Functions for:
  - AI post generation
  - Threads API posting
  - Scheduled post processing
- Lovable AI Gateway for content generation
- PostgreSQL database for data storage

### Security
- Row Level Security (RLS) policies on all tables
- Encrypted credential storage
- Authentication required for all operations

## Support

For issues or questions:
1. Check the console for error messages
2. Review the post history for failure details
3. Verify all API credentials are correct
4. Ensure scheduled posts have future next_post_time values

## Future Enhancements

Potential features to add:
- Multiple social platforms (Twitter, Instagram, etc.)
- Advanced scheduling (specific times, days of week)
- Analytics and performance tracking
- Post preview before scheduling
- Bulk template import/export
- Team collaboration features