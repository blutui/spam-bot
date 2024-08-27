import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const secretKey = process.env.SECRET_KEY || '';

// Define the schema for the request body
const RequestSchema = z.object({
  content: z.record(z.unknown()),
});

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    // Validate the authorization header
    const authHeader = request.headers?.['authorization'] ?? '';
    if (authHeader !== `Bearer ${secretKey}`) {
      response.statusCode = 401;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Validate the request body
    const validationResult = RequestSchema.safeParse(request.body);
    if (!validationResult.success) {
      response.statusCode = 400;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: 'Invalid request body', details: validationResult.error.format() }));
      return;
    }

    const { content } = validationResult.data;
    const formContent = JSON.stringify(content);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a spam detection assistant. Respond with a number between 0 and 100 indicating the likelihood that the given content is spam. 0 means definitely not spam, 100 means definitely spam." },
        { role: "user", content: `What's the spam likelihood of this content? ${formContent}` }
      ],
      max_tokens: 10,
    });

    const spamScore = parseInt(completion.choices[0].message.content?.trim() || '0');
    const validatedSpamScore = Math.max(0, Math.min(100, spamScore));

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ spamScore: validatedSpamScore }));
  } catch (error) {
    console.error('Error checking spam:', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}
