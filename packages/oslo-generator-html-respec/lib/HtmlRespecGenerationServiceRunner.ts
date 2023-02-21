import type { CliArgv, Logger, LogLevel } from '@oslo-flanders/core';
import { ServiceIdentifier, VoidLogger, WinstonLogger, AppRunner } from '@oslo-flanders/core';

import yargs from 'yargs';
import { container } from './config/DependencyInjectionConfig';
import type { HtmlRespecGenerationServiceConfiguration } from './config/HtmlReSpecGenerationServiceConfiguration';
import type { HtmlRespecGenerationService } from './HtmlReSpecGenerationService';

export class HtmlRespecGenerationServiceRunner extends AppRunner {
  public async runCli(argv: CliArgv): Promise<void> {
    const yargv = yargs(argv.slice(2))
      .usage('node ./bin/runner.js [args]')
      .option('input', { describe: 'The input file to generate a JSON-LD context from.' })
      .option('output', { describe: 'Name of the output file.', default: 'context.jsonld' })
      .option('language', { describe: 'The language in which the context must be generated.' })
      .option('silent',
        {
          describe: 'All logs are suppressed',
          default: false,
          boolean: true,
        })
      .demandOption(['input', 'language'])
      .help('h')
      .alias('h', 'help');

    const params = await yargv.parse();
    const configuration = container.get<HtmlRespecGenerationServiceConfiguration>(ServiceIdentifier.Configuration);
    await configuration.createFromCli(params);

    if (params.silent) {
      container.bind<Logger>(ServiceIdentifier.Logger)
        .to(VoidLogger);
    } else {
      container.bind<Logger>(ServiceIdentifier.Logger)
        .toDynamicValue(() => new WinstonLogger(<LogLevel>params.logLevel));
    }

    const generationService = container.get<HtmlRespecGenerationService>(ServiceIdentifier.GenerationService);
    generationService.run().catch(error => console.error(error));
  }
}

