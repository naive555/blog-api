import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { BlogImageModule } from './blog-image/blog-image.module';
import { BlogModule } from './blog/blog.module';
import { CommentModule } from './comment/comment.module';
import { AppConfigModule } from './config/app.config.module';
import { LoggingInterceptor } from './middleware/loggin.interceptor';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    UserModule,
    BlogModule,
    BlogImageModule,
    CommentModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
