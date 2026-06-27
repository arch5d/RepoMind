import { CloudClient } from 'chromadb';
import dotenv from 'dotenv';

dotenv.config();

const client = new CloudClient();

let collectionPromise: ReturnType<typeof client.getOrCreateCollection> | null = null;

const getCollection = async () => {
  if (!collectionPromise) {
    collectionPromise = client.getOrCreateCollection({
      name: "my_collection",
    });
  }
  return collectionPromise;
};

export default getCollection;
