# API Quotas and Rate Limits

## Gemini Image Generation API

### Free Tier Limits
The Gemini API has strict free tier limits for image generation:

- **Model**: `gemini-2.5-flash-image` (or `gemini-2.5-flash-preview-image`)
- **Requests per day**: Limited (varies by region)
- **Requests per minute**: Very limited on free tier
- **Input tokens per minute**: Limited

### Current Implementation
The code now includes:
1. **3-second delay** between successful image generations
2. **Automatic skip** of remaining images if rate limit is hit
3. **2-second retry delay** for failed attempts
4. **Graceful degradation** - frames display without images if generation fails

### Solutions for Rate Limiting

#### Option 1: Wait and Retry
If you hit the rate limit, wait 30-60 seconds and try again with fewer images.

#### Option 2: Upgrade to Paid Tier
- Visit: https://ai.google.dev/pricing
- Paid tier has much higher limits
- More cost-effective for production use

#### Option 3: Use Alternative Image Generation
Consider using:
- DALL-E 3 (OpenAI)
- Stable Diffusion
- Midjourney API
- Imagen (Google Cloud - different from Gemini)

## Fish Audio TTS API

### Current Error
```
{"message":"API key invalid or no credit left","status":402}
```

### Solutions
1. Check your API key in `.env` file
2. Verify account has credits at https://fish.audio
3. Top up credits if needed
4. Ensure API key has correct permissions

## Recommendations

### For Development
- Test with 1-2 frames first
- Use longer delays between requests (5-10 seconds)
- Consider mock data for testing UI

### For Production
- Upgrade to paid tiers for both APIs
- Implement proper queue system for image generation
- Add user-facing rate limit messages
- Consider caching generated images
