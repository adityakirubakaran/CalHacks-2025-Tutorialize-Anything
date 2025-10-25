# BrightData Crawl API Setup Guide

This project uses BrightData's Crawl API for web scraping instead of the Web Unlocker API.

## Getting Your BrightData Credentials

### 1. Get Your API Key

1. Sign up or log in at https://brightdata.com
2. Go to https://brightdata.com/cp/setting/users
3. Find or create an API token
4. Copy your API key (it will look like: `b5648e1096c6442f60a6c4bbbe73f8d2234d3d8324554bd6a7ec8f3f251f07df`)

### 2. Get Your Dataset ID

1. Go to your BrightData dashboard
2. Navigate to **Datasets** or **Web Scraper**
3. Create a new dataset or select an existing one
4. Your dataset ID will be in the format: `gd_m6gjtfmeh43we6cqc`
5. Copy this ID

### 3. Add to Your .env File

```bash
BRIGHTDATA_API_KEY=your_api_key_here
BRIGHTDATA_DATASET_ID=your_dataset_id_here
```

## How the Crawl API Works

The app uses the **synchronous scrape endpoint** for simplicity:

1. **Single Request**: Send a POST request with the URL to scrape
2. **Immediate Response**: Get HTML content directly in the response
3. **No Polling**: No need to wait or check status - it's instant!

## API Endpoint Used

- **Synchronous Scrape**: `POST https://api.brightdata.com/datasets/v3/scrape?dataset_id={dataset_id}&format=html`

## Advantages Over Web Unlocker

- More structured data extraction
- Better for repeated scraping tasks
- Can handle multiple URLs in one request
- Built-in data formatting options
- More reliable for complex websites

## Troubleshooting

### "BrightData API credentials not configured"
- Make sure both `BRIGHTDATA_API_KEY` and `BRIGHTDATA_DATASET_ID` are set in your `.env` file

### "BrightData scrape failed"
- Check that your API key is valid
- Verify your dataset ID is correct
- Ensure you have credits in your BrightData account

## Documentation

Full API documentation: https://docs.brightdata.com/api-reference/rest-api/scraper/crawl-api
