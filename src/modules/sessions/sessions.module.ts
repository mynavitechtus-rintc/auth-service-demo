import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';

// SessionsController (src/modules/sessions/sessions.controller.ts) is
// deliberately registered in AuthModule's `controllers`, not here — see the
// comment on that array in auth.module.ts for why (it needs AuthService,
// and adding it here would require importing AuthModule back in, creating a
// circular module dependency).
@Module({
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
