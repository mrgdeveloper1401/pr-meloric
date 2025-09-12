import { IsNotEmpty, IsNumber, IsString } from "class-validator";


export class CreateCommentDTO{
  @IsNumber()
  @IsNotEmpty()
  song_id: number;

  @IsString()
  @IsNotEmpty()
  body: string;
}

export interface UpdateCommentDTO {
  body?: string;
  is_active?: boolean;
}

export interface CommentResponseDTO {
  id: number;
  body: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  user: {
    id: number;
    username: string;
  };
  song: {
    id: number;
    title: string;
  };
}
