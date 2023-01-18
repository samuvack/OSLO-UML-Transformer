import type { IGenerationService } from '@oslo-flanders/core';
import { IConfiguration, ServiceIdentifier } from '@oslo-flanders/core';
import { inject, injectable } from 'inversify';

@injectable()
export class HtmlRespecGenerationService implements IGenerationService {
  public readonly configuration: IConfiguration;

  public constructor(@inject(ServiceIdentifier.Configuration) config: IConfiguration) {
    this.configuration = config;
  }

  public async run(): Promise<void> {
    console.log('Method not implementedy yet.');
  }
}
