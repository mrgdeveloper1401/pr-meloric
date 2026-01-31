import multer from "multer";
import { Request, Response, NextFunction } from "express";

export const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: false,
        message: "File size is too large. Maximum allowed size is 10MB",
      });
    }
  } else {
    next();
  }
};

// handle error upload story error
export const handleUploadMediaStoryMidd = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          status: false,
          message: "File size is too large. Maximum allowed size is 50MB",
        });
      default:
        return res.status(400).json({
          status: false,
          message: `error upload file: ${err.message}`,
        });
    }
  } else if (err) {
    return res.status(400).json({
      status: false,
      message: err.message,
    });
  }

  next();
};
