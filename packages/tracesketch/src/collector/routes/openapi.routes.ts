import express from 'express';
import {
  createOpenApiDoc,
  getOpenApiDoc,
  getOpenApiDocs,
  deleteOpenApiDoc,
} from '../controller/openapi.controller';

const router = express.Router();

router.post('/', createOpenApiDoc);
router.get('/:id', getOpenApiDoc);
router.get('/', getOpenApiDocs);
router.delete('/:id', deleteOpenApiDoc);

export default router;
