import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateBlogDto {
  @ApiProperty({ example: 'My First Blog Post' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'This is the full content of the blog post.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  content: string;
}
