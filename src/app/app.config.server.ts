import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { CONTENT_LOADER } from './core/content-loader';
import { serverContentLoader } from './core/content-loader.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: CONTENT_LOADER, useValue: serverContentLoader },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
