import type { CliArgv } from '@oslo-flanders/core';
import { AppRunner } from '@oslo-flanders/core';

export class HtmlRespecGenerationServiceRunner extends AppRunner {
  public runCli(argv: CliArgv): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
