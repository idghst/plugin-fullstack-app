import { Global, Module } from '@nestjs/common';
import { CONFIG, readConfig } from './environment';
@Global()
@Module({ providers: [{ provide: CONFIG, useFactory: readConfig }], exports: [CONFIG] })
export class ConfigModule {}
