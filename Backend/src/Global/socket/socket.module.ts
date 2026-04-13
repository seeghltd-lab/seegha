import { Global, Module } from '@nestjs/common';
import { AppSocketGateway } from './socket.gateway';

@Global()
@Module({
  providers: [AppSocketGateway],
  exports: [AppSocketGateway],
})
export class SocketModule {}
