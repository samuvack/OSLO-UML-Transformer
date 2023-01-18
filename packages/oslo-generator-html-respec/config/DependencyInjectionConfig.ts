import 'reflect-metadata';
import { ServiceIdentifier } from '@oslo-flanders/core';
import type { IConfiguration, IGenerationService } from '@oslo-flanders/core';

import { Container } from 'inversify';
import { HtmlRespecGenerationService } from '../lib/HtmlRespecGenerationService';
import { HtmlRespecGenerationServiceConfiguration } from './HtmlRespecGenerationServiceConfiguration';

export const container = new Container();

container.bind<IGenerationService>(ServiceIdentifier.GenerationService)
  .to(HtmlRespecGenerationService)
  .inSingletonScope();

container.bind<IConfiguration>(ServiceIdentifier.Configuration)
  .to(HtmlRespecGenerationServiceConfiguration)
  .inSingletonScope();
