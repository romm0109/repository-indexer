import { QdrantClient } from '@qdrant/js-client-rest';

async function test() {
  console.log('Testing Qdrant connection...');
  const client = new QdrantClient({
    url: 'http://127.0.0.1:6333',
    checkCompatibility: false,
  });

  try {
    const result = await client.getCollections();
    console.log('Success! Collections:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();