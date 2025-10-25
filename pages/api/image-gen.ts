import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';
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
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

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

    for (let i = 0; i < frameKeys.length; i++) {
      const key = frameKeys[i];
      const description = storyboard[key];

      // Create a prompt optimized for cartoon-style image generation
      const prompt = `Cartoon illustration, simple colorful style: ${description}`;

      console.log(`Generating image for ${key}: "${prompt}"`);

      let imageData: Buffer | null = null;

      // Try up to 3 retries for image generation
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Using Gemini SDK for image generation with free tier model
          const response = await genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
          });
          
          // Extract image from response
          if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                  // Found base64 image data
                  imageData = Buffer.from(part.inlineData.data, 'base64');
                  console.log(`Successfully generated image for ${key}`);
                  break;
                }
              }
            }
          }

          if (imageData) break;
          
          // If no image data found, log and retry
          console.warn(`No image data in response for ${key}, attempt ${attempt + 1}`);
        } catch (genErr: any) {
          const isRateLimitError = genErr?.message?.includes('quota') || genErr?.message?.includes('RESOURCE_EXHAUSTED');
          
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
      
      // Add delay between successful requests to avoid rate limiting
      if (imageData && i < frameKeys.length - 1) {
        console.log('Waiting 3 seconds before next image generation to respect rate limits...');
        await new Promise(resolve => setTimeout(resolve, 3000));
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
