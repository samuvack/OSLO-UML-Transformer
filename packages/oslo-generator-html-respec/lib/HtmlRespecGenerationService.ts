import { IGenerationService, ns } from "@oslo-flanders/core";
import { ServiceIdentifier } from "@oslo-flanders/core";
import { inject, injectable } from "inversify";
import { createN3Store } from "@oslo-flanders/core";
import { HtmlRespecGenerationServiceConfiguration } from "./config/HtmlRespecGenerationServiceConfiguration";
import * as nj from "nunjucks";
import { resolve } from "path";
import { writeFile, writeFileSync } from "fs";
import { execSync } from "child_process";
import * as N3 from "n3";
import type * as RDF from "@rdfjs/types";

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

    const [classes, attributes] = await Promise.all([
      this.createRespecClasses,
      this.createRespecAttributes,
    ]);

    const html = nj.render("index.njk", {
      name: "James",
      respecConfig: this.createRespecConfig(),
      classes,
      attributes,
    });
    writeFileSync("rendered.html", html);
    execSync(`npm --prefix ${__dirname}/.. run generate-respec`);
  }

  private createRespecConfig(): string {
    const config = {
      specStatus: "unofficial",
      editors: [{ name: "Dwight", url: "https://your-site.com" }],
      github: "w3c/respec",
      publishDate: "2023-03-27",
      shortName: "respec",
    };
    return `<script class="remove">var respecConfig = ${JSON.stringify(
      config
    )}</script>`;
  }

  public async createRespecClasses(store: N3.Store): Promise<any[]> {
    const classes = store.getSubjects(ns.rdf("type"), ns.rdfs("Class"), null);
    const inPackageClasses = this.filterOnScope(classes, store);


    return inPackageClasses.map((subject) => {
      // label, usagenote
      return {
        id: '1'
      }
    });
  }

  public async createRespecAttributes(store: N3.Store): Promise<any[]> {
    return [];
  }

  private filterOnScope(
    subjects: RDF.Quad_Subject[],
    store: N3.Store
  ): RDF.Quad_Subject[] {
    return subjects.filter((subject) => {
      const scopes = store.getObjects(subject, ns.example("scope"), null);

      if (scopes.length === 0) {
        throw new Error(`No scope found for ${subject}.`);
      }

      const scope = scopes.shift()!;

      if (
        scope.value === "https://data.vlaanderen.be/id/concept/scope/InPackage"
      ) {
        return true;
      }
    });
  }
  
}
