import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';

const router = Router();

// Directorio donde se guardan las imágenes
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
    }
  },
});

// POST /api/v1/uploads/imagen — solo Admin u Operador
router.post(
  '/imagen',
  autenticar,
  requiereRol('Admin', 'Operador'),
  upload.single('imagen'),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo' });
      return;
    }
    const baseUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';
    const url = `${baseUrl}/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  }
);

export default router;
