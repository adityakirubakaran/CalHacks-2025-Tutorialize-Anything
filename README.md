# Tutorial Maker - AI-Powered Code/Website Tutorial Generator

An innovative full-stack application that transforms any codebase or website into an engaging, cartoon-style storyboard tutorial. Using cutting-edge AI services, it creates minimal, analogy-driven explanations with generated images and voice narration.

## Features

- **Multi-Style Narratives**: Choose from various explanation styles:
  - Explain Like I'm 5
  - College Frat Guy
  - Pizza Restaurant Analogy
  - Car Factory Analogy
  - Adult Professional

- **AI-Powered Analysis**: Uses Claude AI to analyze content and create minimal storyboard frames (3-7 frames typically)

- **Visual Generation**: Generates cartoon-style images using Google Gemini Imagen API

- **Voice Narration**: Creates natural-sounding audio explanations using Fish.Audio TTS

- **Interactive Viewer**: Navigate through frames, play audio, and request alternative phrasings

- **Content Scraping**: Fetches website content using BrightData's Web Unlocker API or GitHub repository content

## Architecture

```
Frontend (Next.js + Tailwind)
    ↓
API Routes (/api/*)
    ↓
External Services:
  - BrightData (Web scraping)
  - Anthropic Claude (AI reasoning)
  - Google Gemini (Image generation)
  - Fish.Audio (Text-to-speech)
  - AWS S3 (Storage)
```

## Prerequisites

Before you begin, you'll need accounts and API keys for the following services:

1. **BrightData** - For web scraping
   - Sign up at https://brightdata.com
   - Create a Web Unlocker zone
   - Get your API key and zone name

2. **Anthropic Claude** - For AI reasoning
   - Sign up at https://console.anthropic.com
   - Create an API key

3. **Google Gemini** - For image generation
   - Sign up at https://ai.google.dev
   - Create a Gemini API key from the Google AI Studio

4. **Fish.Audio** - For text-to-speech
   - Sign up at https://fish.audio
   - Create an API key

5. **AWS S3** - For media storage
   - Create an S3 bucket
   - Create an IAM user with S3 write permissions
   - Get access key ID and secret access key
   - Configure bucket for public read access (or use signed URLs)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd TutorialMaker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your actual API keys:
```env
# BrightData Configuration
BRIGHTDATA_API_KEY=your_brightdata_api_key
BRIGHTDATA_ZONE=your_brightdata_zone_name

# Anthropic Claude Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Image Generation (Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Fish.Audio TTS Configuration
FISHAUDIO_API_KEY=your_fishaudio_api_key

# AWS S3 Configuration
AWS_S3_BUCKET=your_s3_bucket_name
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-west-2
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Enter URL**: Provide a GitHub repository URL or any website URL
2. **Select Style**: Choose your preferred explanation style from the dropdown
3. **Generate**: Click "Generate Tutorial" and wait for the AI to analyze the content
4. **View Tutorial**: Navigate through frames using Previous/Next buttons
5. **Play Audio**: Click "Play Audio" to hear the narration for each frame
6. **Rephrase**: Click "Rephrase" to get an alternative explanation for the current frame

## Project Structure

```
TutorialMaker/
├── pages/
│   ├── index.tsx              # Input form page
│   ├── tutorial/
│   │   └── [sessionId].tsx    # Tutorial viewer page
│   ├── api/
│   │   ├── tutorial.ts        # Content analysis & storyboard generation
│   │   ├── image-gen.ts       # Image generation
│   │   ├── audio-gen.ts       # Audio narration generation
│   │   └── rephrase-audio.ts  # Audio rephrasing
│   └── _app.tsx               # App wrapper
├── lib/
│   └── session-storage.ts     # Session management utilities
├── styles/
│   └── globals.css            # Global styles with Tailwind
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── next.config.js             # Next.js configuration
└── README.md                  # This file
```

## API Endpoints

### POST /api/tutorial
Creates a new tutorial session by analyzing the provided URL.

**Request Body:**
```json
{
  "url": "https://github.com/user/repo",
  "style": "explain5"
}
```

**Response:**
```json
{
  "sessionId": "uuid-string",
  "steps": {
    "step1": "Description...",
    "step2": "Description..."
  }
}
```

### GET /api/tutorial?sessionId={id}
Retrieves tutorial data for a session.

### POST /api/image-gen
Generates images for all frames in a session.

**Request Body:**
```json
{
  "sessionId": "uuid-string"
}
```

### POST /api/audio-gen
Generates audio narration for all frames in a session.

**Request Body:**
```json
{
  "sessionId": "uuid-string"
}
```

### POST /api/rephrase-audio
Generates a rephrased audio narration for a specific frame.

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "frameIndex": 0,
  "newStyle": "professional" // optional
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### AWS Lambda

1. Use Serverless Framework or AWS SAM
2. Package the Next.js application
3. Configure API Gateway
4. Set up environment variables
5. Deploy

## Cost Considerations

- **BrightData**: Charges per request (check their pricing)
- **Anthropic Claude**: Usage-based pricing per token
- **Google Gemini**: Free tier available, then usage-based pricing
- **Fish.Audio**: May have free tier, then usage-based
- **AWS S3**: Storage and bandwidth costs

Monitor your usage to avoid unexpected bills.

## Limitations

- Session data is stored in-memory by default (replace with Redis/DynamoDB for production)
- Image generation can take 2-3 seconds per frame
- Tutorial generation may timeout on serverless platforms with long content
- S3 bucket must be configured with appropriate CORS settings

## Future Enhancements

- [ ] Persistent session storage (Redis, DynamoDB)
- [ ] User authentication with Sui zkLogin
- [ ] Caching of previously generated tutorials
- [ ] Parallel image/audio generation for faster processing
- [ ] Support for video export
- [ ] Custom voice selection
- [ ] Multiple language support
- [ ] Tutorial sharing and social features

## Troubleshooting

### Images not loading
- Check S3 bucket permissions (public-read ACL or CORS configuration)
- Verify AWS credentials are correct
- Check Next.js image domains configuration

### Audio not playing
- Verify Fish.Audio API key is valid
- Check browser console for CORS errors
- Ensure S3 audio files are accessible

### Tutorial generation fails
- Check all API keys are correctly configured
- Verify the URL is accessible
- Check Vercel/Lambda function timeout settings
- Review server logs for specific errors

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## Acknowledgments

- Anthropic for Claude AI
- BrightData for web scraping capabilities
- Google for Gemini AI and Imagen image generation
- Fish.Audio for text-to-speech services
- The Next.js and React teams for excellent frameworks
