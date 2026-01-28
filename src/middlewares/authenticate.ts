import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

const envPath = path.resolve(process.cwd(), "../../.env");
dotenv.config({ path: envPath });

// middlewere authenticate
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authentication credentials were not provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token.",
    });
  }
};

// middlewere not authenticate
export const notAuthenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  const checkOne = authHeader === null;
  const checkTwo = authHeader || authHeader.startsWith("Bearer ");
  if (checkOne || checkTwo) {
    return res
      .status(400)
      .json({ message: "Authentication credentials were provided." });
  }
};

export const checkUserAuthenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user.user_id;
  const userRepository = AppDataSource.getRepository(User);
  const checkUser = userRepository.findOne({
    where: {
      id: userId,
      is_active: true,
    },
    select: {
      id: true,
    },
  });
  if (!checkUser) {
    return res.status(404).json({
      status: false,
      message: "user not found",
    });
  } else {
    next();
  }
};

// middlewere check artist user
export const isArtistUserMiddlewere = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userRepository = AppDataSource.getRepository(User);
  const isArtist = await userRepository.findOne({
    where: {
      id: (req as any).user.user_id,
    },
    select: {
      is_artist: true,
      id: true,
      is_active: true,
    },
  });

  // check aritst user dose exits
  if (!isArtist.is_artist) {
    return res.status(403).json({
      status: false,
      message: "your account not artist",
    });
  }

  // check artist_user is_active
  if (!isArtist.is_active) {
    return res.status(403).json({
      status: false,
      message: "your account is been!",
    });
  } else {
    next();
  }
};
