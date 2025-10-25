import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSession, updateFrame } from '@/lib/session-storage';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET || '';
const FISH_API_URL = 'https://api.fish.audio/v1/tts';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, frameIndex, newStyle } = req.body;

  if (!sessionId || frameIndex === undefined) {
    return res.status(400).json({ error: 'Missing sessionId or frameIndex' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const frameIdx = Number(frameIndex);
  const frameData = session.frames[frameIdx];

  if (!frameData) {
    return res.status(404).json({ error: 'Frame not found' });
  }

  const originalText = frameData.text;

  try {
    // Build prompt for Claude to rephrase
    let styleInstruction = newStyle ? ` in a "${newStyle}" style` : ' using different wording';
    const prompt = `Please rephrase the following explanation${styleInstruction}, keeping the same meaning but expressing it differently:\n\n"${originalText}"\n\nProvide only the rephrased text without any introduction or explanation.`;

    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let newExplanation = content.text.trim();
    // Remove wrapping quotes if any
    newExplanation = newExplanation.replace(/^["']|["']$/g, '');

    if (!newExplanation || newExplanation.length < 10) {
      throw new Error('Claude did not return a valid rephrasing');
    }

    console.log(`Rephrased text for frame ${frameIdx}:`, newExplanation);

    // Call Fish Audio to generate new audio for the rephrased text
    const ttsPayload = {
      text: newExplanation,
      format: 'mp3',
      sample_rate: 44100,
      reference_id: null
    };

    const ttsRes = await fetch(FISH_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FISHAUDIO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ttsPayload)
    });

    if (!ttsRes.ok) {
      const errorText = await ttsRes.text();
      console.error('Fish TTS rephrase error:', errorText);
      throw new Error(`Fish TTS rephrase error: ${ttsRes.status}`);
    }

    const audioData = await ttsRes.arrayBuffer();

    // Upload new audio to S3 with timestamp to avoid caching issues
    const fileKey = `${sessionId}/frame${frameIdx + 1}_rephrase_${Date.now()}.mp3`;

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: Buffer.from(audioData),
      ContentType: 'audio/mpeg'
    }));

    const newAudioUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;

    // Update session data with new audio and text
    updateFrame(sessionId, frameIdx, {
      audioUrl: newAudioUrl,
      text: newExplanation,
      imageUrl: frameData.imageUrl, // Keep existing image
    });

    console.log(`Successfully rephrased and regenerated audio for frame ${frameIdx}`);

    return res.status(200).json({
      newAudioUrl,
      newText: newExplanation
    });
  } catch (error) {
    console.error('Error in rephrase:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to rephrase audio';
    return res.status(500).json({ error: errorMessage });
  }
}
