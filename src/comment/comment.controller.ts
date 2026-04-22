import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Comment } from './comment.entity';
import { CommentService } from './comment.service';
import { CommentQueryDto } from './dto/comment-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comment')
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // --- Public endpoint ---

  @ApiOperation({
    summary: 'Submit a comment on a blog post (pending approval)',
  })
  @ApiCreatedResponse({ type: Comment })
  @ApiNotFoundResponse({ description: 'Blog not found' })
  @Post('blog/:blogId/comment')
  createComment(
    @Param('blogId', ParseUUIDPipe) blogId: string,
    @Body() body: CreateCommentDto,
  ) {
    return this.commentService.create(blogId, body);
  }

  // --- Admin endpoints (JWT required) ---

  @ApiOperation({ summary: '[Admin] List all comments with optional filters' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [Comment] })
  @UseGuards(JwtAuthGuard)
  @Get('comment')
  findAll(@Query() query: CommentQueryDto) {
    return this.commentService.findAll(query);
  }

  @ApiOperation({ summary: '[Admin] Approve a comment' })
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('comment/:id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentService.approve(id);
  }

  @ApiOperation({ summary: '[Admin] Reject a comment' })
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('comment/:id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentService.reject(id);
  }
}
