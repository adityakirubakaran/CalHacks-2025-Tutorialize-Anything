import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSession, updateFrame } from '@/lib/session-storage';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET || '';
// Pollinations.ai - Free image generation, no API key needed
const POLLINATIONS_API = 'https://image.pollinations.ai/prompt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(400).json({ error: 'Session not found' });
  }

  try {
    const storyboard = session.steps;
    const frameKeys = Object.keys(storyboard).sort();
    const imageUrls: string[] = [];

    // Initialize frames with text content first, so they exist even if image generation fails
    for (let i = 0; i < frameKeys.length; i++) {
      const key = frameKeys[i];
      const description = storyboard[key];
      updateFrame(sessionId, i, {
        text: description,
      });
    }

    // Build context for sequential storytelling
    const allDescriptions = frameKeys.map(k => storyboard[k]).join(' -> ');
    const storyContext = `This is part of a sequential story about: ${allDescriptions.substring(0, 200)}`;

    for (let i = 0; i < frameKeys.length; i++) {
      const key = frameKeys[i];
      const description = storyboard[key];

      // Extract just the visual description part (after "Picture", "Visualize", "Imagine", etc.)
      // This helps separate the tutorial text from the visual description
      const visualMatch = description.match(/(?:picture|visualize|imagine|see|shows?|depicts?)[:\s]+([^.]+)/i);
      const visualDescription = visualMatch ? visualMatch[1] : description;
      
      // Build sequential context for visual continuity
      const previousContext = i > 0 ? `Continuing the story, ` : '';
      const sequenceInfo = `Frame ${i + 1} of ${frameKeys.length}. `;
      
      // Clean up any quoted text
      const cleanDescription = visualDescription.replace(/['"][^'"]*['"]/g, '').trim();
      
      // Create a prompt that emphasizes visual storytelling without text
      const prompt = `${sequenceInfo}${previousContext}Friendly cartoon illustration, warm colorful style, NO text NO words NO letters NO labels anywhere, consistent characters and art style: ${cleanDescription}`;

      console.log(`Generating image for ${key}: "${prompt}"`);

      let imageData: Buffer | null = null;

      // Try up to 3 retries for image generation
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Using Pollinations.ai - Free, no API key needed
          // URL format: https://image.pollinations.ai/prompt/{encoded_prompt}
          // Using square 1024x1024 for proper composition
          const encodedPrompt = encodeURIComponent(prompt);
          // Maximum strength negative prompt - list everything text-related
          const negativePrompt = encodeURIComponent('text, words, letters, labels, signs, writing, typography, captions, subtitles, titles, numbers, digits, symbols, alphabet, characters, fonts, readable text, written words, inscriptions, banners, posters, books with text, newspapers, screens with text, billboards, name tags, speech bubbles with text');
          const imageUrl = `${POLLINATIONS_API}/${encodedPrompt}?width=1024&height=1024&seed=${Date.now()}&nologo=true&enhance=true&model=turbo&negative=${negativePrompt}`;
          
          console.log(`Calling Pollinations.ai API: ${imageUrl.substring(0, 100)}...`);
          
          const response = await fetch(imageUrl, {
            method: 'GET',
          });

          console.log(`Response status: ${response.status}`);
          console.log(`Response content-type: ${response.headers.get('content-type')}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Pollinations API error:`, errorText);
            throw new Error(`Pollinations API error: ${response.status} - ${errorText}`);
          }

          // Response is the image blob directly
          const imageBlob = await response.arrayBuffer();
          imageData = Buffer.from(imageBlob);
          console.log(`Successfully generated image for ${key}, size: ${imageData.length} bytes`);
          break;
        } catch (genErr: any) {
          const isRateLimitError = genErr?.message?.includes('rate limit') || genErr?.message?.includes('429');
          
          console.error(`Image gen failed on attempt ${attempt + 1} for ${key}:`, genErr);
          
          if (isRateLimitError) {
            console.warn(`Rate limit hit for ${key}. Skipping remaining images to avoid further quota issues.`);
            // Skip all remaining images if we hit rate limit
            i = frameKeys.length;
            break;
          }
          
          if (attempt === 2) {
            // Log error but continue to next frame instead of throwing
            console.error(`Skipping image generation for ${key} after 3 failed attempts`);
            break;
          }
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Add small delay between successful requests
      if (imageData && i < frameKeys.length - 1) {
        console.log('Waiting 1 second before next image generation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!imageData) {
        console.warn(`Failed to generate image for ${key}, frame will display without image`);
        continue; // Skip to next frame instead of throwing error
      }

      // Upload imageData to S3
      const fileKey = `${sessionId}/frame${i + 1}.png`;

      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: imageData,
          ContentType: 'image/png'
        }));

        const publicUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
        imageUrls.push(publicUrl);

        // Update the session with the image URL
        updateFrame(sessionId, i, {
          text: description,
          imageUrl: publicUrl,
        });

        console.log(`Successfully generated and uploaded image ${i + 1}/${frameKeys.length}`);
      } catch (uploadErr) {
        console.error(`Failed to upload image for ${key}:`, uploadErr);
        // Continue to next frame even if upload fails
      }
    }

    return res.status(200).json({ images: imageUrls, message: `Generated ${imageUrls.length}/${frameKeys.length} images` });
  } catch (error) {
    console.error('Error in image generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Image generation failed';
    return res.status(500).json({ error: errorMessage });
  }
}
