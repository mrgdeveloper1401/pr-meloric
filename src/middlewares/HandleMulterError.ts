import multer from 'multer';
import { Request, Response, NextFunction } from 'express';


export const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: false,
        message: "File size is too large. Maximum allowed size is 10MB"
      });
    }

  } else {
    next();
  }
};
