import type { NextApiRequest, NextApiResponse } from 'next';
import { Anthropic } from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import { createSession, getSession, SessionData } from '@/lib/session-storage';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Helper: fetch website content via BrightData Unlocker
async function fetchWebsiteContent(url: string): Promise<string> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const zone = process.env.BRIGHTDATA_ZONE;

  if (!apiKey || !zone) {
    throw new Error('BrightData API credentials not configured');
  }

  const payload = {
    zone: zone,
    url: url,
    format: 'raw'
  };

  const res = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`BrightData request failed with status ${res.status}`);
  }

  const html = await res.text();
  return html;
}

// Helper: fetch GitHub repo content (README.md as a summary)
async function fetchRepoContent(repoUrl: string): Promise<string> {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)(?:\/|$)/);
    if (!match) throw new Error('Invalid GitHub repo URL');

    const repoPath = match[1];
    const rawUrl = `https://raw.githubusercontent.com/${repoPath}/main/README.md`;

    const res = await fetch(rawUrl);
    if (res.ok) {
      const text = await res.text();
      return text;
    }

    // Try master branch if main doesn't exist
    const masterUrl = `https://raw.githubusercontent.com/${repoPath}/master/README.md`;
    const masterRes = await fetch(masterUrl);
    if (masterRes.ok) {
      return await masterRes.text();
    }

    return 'This repository contains code. No README available.';
  } catch (err) {
    console.error('Failed to fetch repo content:', err);
    return 'This repository contains code files.';
  }
}

// Helper: Build Claude prompt with analogy instructions
function buildClaudePrompt(contentTranscript: string, style: string) {
  let styleHint = '';
  switch(style) {
    case 'explain5':
      styleHint = 'Explain like I am 5 years old, using simple words and concepts.';
      break;
    case 'frat':
      styleHint = 'Explain in a casual college frat guy tone, with humor and slang.';
      break;
    case 'pizza':
      styleHint = 'Use a Pizza Restaurant as an analogy context (e.g., orders, kitchen, delivery).';
      break;
    case 'car':
      styleHint = 'Use a Car Factory analogy for the explanation (e.g., assembly line, parts, workers).';
      break;
    case 'professional':
      styleHint = 'Explain in a formal, adult professional manner suitable for business contexts.';
      break;
    default:
      styleHint = 'Explain in a clear and engaging manner.';
  }

  const systemPrompt = `You are an analogy-focused reasoning agent. Convert the input content into a minimal visual storyboard using analogies.
Each frame should be a cartoon-like scene that represents part of the content's logic, accompanied by an explanation in natural language.

IMPORTANT: Only output a valid JSON object where each key is a step (step1, step2, step3, etc.) and each value is a string describing the scene and the explanation.
Make the number of steps as small as possible (typically 3-7 frames) but sufficient to cover the key flow or data movement in the content.

Example output format:
{
  "step1": "A house with two windows representing the main application entry point",
  "step2": "A delivery truck carrying packages representing data being processed",
  "step3": "A warehouse storing boxes representing the database"
}

Do not include any text before or after the JSON object. Only return valid JSON.`;

  const userPrompt = `Content to explain:\n"""${contentTranscript.substring(0, 8000)}"""\n\nStyle requirement: ${styleHint}\n\nNow produce the storyboard JSON with 3-7 steps maximum.`;

  return { systemPrompt, userPrompt };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET requests to retrieve tutorial data by sessionId
  if (req.method === 'GET') {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid sessionId' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json(session);
  }

  // Handle POST requests to create a new tutorial
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url, style } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    let contentText = '';

    // Fetch content based on URL type
    if (url.includes('github.com')) {
      contentText = await fetchRepoContent(url);
    } else {
      const html = await fetchWebsiteContent(url);

      // Parse HTML to text using cheerio
      const $ = cheerio.load(html);
      // Remove script and style elements
      $('script, style, nav, footer').remove();
      // Get text content
      contentText = $('body').text().replace(/\s+/g, ' ').trim();
      contentText = contentText.slice(0, 10000);
    }

    if (!contentText || contentText.length < 50) {
      throw new Error('Could not extract sufficient content from the URL');
    }

    // Build the prompt for Claude
    const { systemPrompt, userPrompt } = buildClaudePrompt(contentText, style);

    // Call Claude API to get the storyboard JSON
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Extract the response content
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let assistantReply = content.text;

    // Parse the JSON from Claude's reply
    let storyboard: Record<string, string>;
    try {
      storyboard = JSON.parse(assistantReply);
    } catch (e) {
      // If Claude output is not pure JSON, try to extract JSON substring
      const jsonMatch = assistantReply.match(/\{[\s\S]+\}/);
      if (jsonMatch) {
        storyboard = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse Claude response:', assistantReply);
        throw new Error('Claude output was not valid JSON');
      }
    }

    // Validate that we have at least one step
    if (Object.keys(storyboard).length === 0) {
      throw new Error('Claude did not generate any storyboard steps');
    }

    // Generate a session ID and store the data
    const sessionId = uuidv4();
    createSession(sessionId, {
      steps: storyboard,
      frames: [],
      url,
      style: style || 'explain5',
    });

    return res.status(200).json({ sessionId, steps: storyboard });
  } catch (error) {
    console.error('Error in tutorial generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate tutorial';
    return res.status(500).json({ error: errorMessage });
  }
}
