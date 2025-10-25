# Quick Start Guide

Get your Tutorial Maker app running in minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

Then edit `.env.local` with your API keys. You'll need accounts for:

### Required Services:

1. **BrightData** (https://brightdata.com)
   - Create Web Unlocker zone
   - Copy API key and zone name

2. **Anthropic** (https://console.anthropic.com)
   - Create API key

3. **Replicate** (https://replicate.com)
   - Get API token from account settings

4. **Fish.Audio** (https://fish.audio)
   - Create API key

5. **AWS S3** (https://aws.amazon.com)
   - Create bucket
   - Create IAM user with S3 permissions
   - Get access key ID and secret

## Step 3: Configure AWS S3 Bucket

Make your S3 bucket public for reading:

### Bucket Policy Example:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### CORS Configuration:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Step 4: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Test the Application

1. Enter a URL (try: `https://github.com/facebook/react`)
2. Select a style (e.g., "Explain Like I'm 5")
3. Click "Generate Tutorial"
4. Wait for generation (may take 30-60 seconds)
5. View and navigate through your tutorial!

## Common Issues

### "BrightData API credentials not configured"
- Verify BRIGHTDATA_API_KEY and BRIGHTDATA_ZONE in .env.local

### "Fish TTS API error"
- Check FISHAUDIO_API_KEY is valid
- Ensure you have credits in your Fish.Audio account

### Images not loading
- Check AWS credentials
- Verify S3 bucket is public or has correct CORS
- Check bucket name matches AWS_S3_BUCKET

### "Session not found"
- Sessions are in-memory and cleared on restart
- For production, implement Redis/DynamoDB storage

## Production Deployment

### Vercel (Easiest):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Environment Variables for Production:
Make sure to add ALL environment variables from .env.local to your Vercel project settings.

## Cost Estimates (Approximate)

Per tutorial generation:
- Claude API: ~$0.01-0.05
- Replicate (images): ~$0.03-0.10 (depending on frames)
- Fish.Audio (TTS): ~$0.01-0.03
- BrightData: ~$0.01-0.05 per page scrape
- S3: Negligible for small files

Total: ~$0.06-0.23 per tutorial

## Next Steps

1. Customize styles in `pages/api/tutorial.ts`
2. Add more narrative styles
3. Implement user authentication
4. Add persistent storage
5. Create tutorial sharing features

## Need Help?

- Check README.md for detailed documentation
- Review troubleshooting section
- Open an issue on GitHub
