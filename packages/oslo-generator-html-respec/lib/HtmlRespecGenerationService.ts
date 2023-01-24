import type { IGenerationService } from '@oslo-flanders/core';
import { ServiceIdentifier } from '@oslo-flanders/core';
import { inject, injectable } from 'inversify';
import { createN3Store } from "@oslo-flanders/core";
import { HtmlRespecGenerationServiceConfiguration } from './config/HtmlRespecGenerationServiceConfiguration';
import * as nj from 'nunjucks';
import { resolve } from 'path';
import { writeFile, writeFileSync } from 'fs';
import { execSync } from 'child_process';

@injectable()
export class HtmlRespecGenerationService implements IGenerationService {
  public readonly configuration: HtmlRespecGenerationServiceConfiguration;

  public constructor(
    @inject(ServiceIdentifier.Configuration)
    config: HtmlRespecGenerationServiceConfiguration
  ) {
    this.configuration = config;
  }

  public async run(): Promise<void> {
    //const store = await createN3Store(this.configuration.input);
    const templateDir = resolve(`${__dirname}/respec`);
    nj.configure(templateDir, { autoescape: false });

    const html = nj.render("index.njk", { name: "James" , respecConfig: this.createRespecConfig()});
    writeFileSync("rendered.html", html);
    execSync(`npm --prefix ${__dirname}/.. run generate-respec`);
  }

  private createRespecConfig(): string {
    const config = {
      specStatus: "unofficial",
      editors: [{ name: "Dwight", url: "https://your-site.com" }],
      github: "w3c/respec",
      publishDate: "2023-03-27",
      shortName: "respec"
    };
    return `<script class="remove">var respecConfig = ${JSON.stringify(
      config
    )}</script>`;
  }

}
