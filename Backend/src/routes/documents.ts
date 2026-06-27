import { Router } from 'express';
import { addNewDocument } from '@/controllers/chromaController';

const router = Router();

router.post('/', addNewDocument);

export default router;
