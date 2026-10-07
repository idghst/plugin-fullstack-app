import { createApp } from './app';
import { CONFIG, type AppConfig } from './config/environment';

async function bootstrap() {
  const app = await createApp();
  const config = app.get<AppConfig>(CONFIG);
  await app.listen(config.PORT, config.HOST);
  const server = app.getHttpServer();
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'api_started',
      port: config.PORT,
      environment: config.NODE_ENV,
    }),
  );
}
void bootstrap().catch(() => {
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'api_startup_failed',
      message: 'Check environment configuration and database connectivity.',
    }),
  );
  process.exitCode = 1;
});
