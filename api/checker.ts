import { VercelResponse, VercelRequest } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const secretKey = process.env.SECRET_KEY || '';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const authHeader = request.headers?.['authorization'] ?? '';
    if (authHeader !== `Bearer ${secretKey}`) {
      response.statusCode = 401;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const body = request.body;
    const formContent = JSON.stringify(body);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a spam detection assistant. Respond with a number between 0 and 100 indicating the likelihood that the given content is spam. 0 means definitely not spam, 100 means definitely spam." },
        { role: "user", content: `What's the spam likelihood of this content? ${formContent}` }
      ],
      max_tokens: 10,
    });

    const spamScore = parseInt(completion.choices[0].message.content?.trim() || '0');
    const validatedSpamScore = Math.max(0, Math.min(100, spamScore)); // Ensure the score is between 0 and 100

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ spamScore: validatedSpamScore }));
  } catch (error) {
    console.error('Error checking spam:', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}
