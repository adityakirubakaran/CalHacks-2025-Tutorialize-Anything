import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  try {
    console.log('Testing S3 URL access:', url);
    
    const response = await fetch(url, {
      method: 'HEAD'
    });

    console.log('S3 URL test response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (response.ok) {
      return res.status(200).json({
        accessible: true,
        status: response.status,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
    } else {
      return res.status(200).json({
        accessible: false,
        status: response.status,
        statusText: response.statusText
      });
    }
  } catch (error) {
    console.error('Error testing S3 URL:', error);
    return res.status(500).json({
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
