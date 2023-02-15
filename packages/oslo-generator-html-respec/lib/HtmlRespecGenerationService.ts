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
    const store = await createN3Store(this.configuration.input);
    const templateDir = resolve(`${__dirname}/respec`);
    nj.configure(templateDir, { autoescape: false });

    const [classes, attributes] = await Promise.all([
      this.createRespecClasses(store),
      this.createRespecAttributes(store)
    ]);

    const html = nj.render("index.njk", {
      name: "Json Test",
      respecConfig: this.createRespecConfig(),
      classes,
      attributes
    });
    writeFileSync("rendered.html", html);
    execSync(`npm --prefix ${__dirname}/.. run generate-respec`);
  }

  private createRespecConfig(): string {
    const config = {
      specStatus: "unofficial",
      editors: [{ name: "Dwight", url: "https://your-site.com" }],
      github: "w3c/respec",
      publishDate: new Date(),
      shortName: "respec",
    };
    return `<script class="remove">var respecConfig = ${JSON.stringify(
      config
    )}</script>`;
  }

  //CLASSES
  public async createRespecClasses(store: N3.Store): Promise<any[]> {
    let languageValue = "nl";
    const classes = store.getSubjects(ns.rdf("type"), ns.owl("Class"), null);
    const inPackageClasses = this.filterOnScope(classes, store);
    return inPackageClasses.map((subject) => {
      const assignedUri = store.getObjects(
        subject,
        ns.example("assignedUri"),
        null
      )[0];
      
      const scope = store.getObjects(
        subject,
        "http://example.org/scope",
        null
      )[0];
      const maxCount = store.getObjects(subject, ns.owl("maxCount"), null)[0];
      const minCount = store.getObjects(subject, ns.owl("minCount"), null)[0];
      const parents = store.getObjects(subject, ns.rdfs("subClassOf"), null);
      const parentInformation: { id: RDF.NamedNode; label: RDF.Literal }[] = [];

      //filter out array defintion from graph
      const definitions = store.getObjects(subject, ns.rdfs("comment"), null);
      const definitionInformation: { language: string; definition: string }[] =
        [];

      definitions.forEach((definition) => {
        if (definition.language === languageValue) {
          console.log("test:", definition.language);
          definitionInformation.push({
            language: definition.language,
            definition: definition.value,
          });
        }
      });

      //filter out array label from graph
      const labels = store.getObjects(subject, ns.rdfs("label"), null);
      const labelInformation: { language: string; label: string }[] =
        [];

      labels.forEach((label) => {
        if (label.language === languageValue) {
          console.log("test:", label.language);
          labelInformation.push({
            language: label.language,
            label: label.value,
          });
        }
      });
      //console.log(definitionInformation);

      parents.forEach((parent) => {
        console.log("parents", parent.id);
        let parentAssignedUri = store.getObjects(
          parent,
          ns.example("assignedUri"),
          null
        )[0];
        let parentLabel = store.getObjects(parent, ns.rdfs("label"), null)[0];
        if (!parentAssignedUri || !parentLabel) {
          const statementIds = store.getSubjects(
            ns.rdf("type"),
            ns.rdf("Statement"),
            null
          );
          const statementSubjectPredicateSubjects = store.getSubjects(
            ns.rdf("subject"),
            subject,
            null
          );
          const statementPredicatePredicateSubjects = store.getSubjects(
            ns.rdf("predicate"),
            ns.rdfs("subClassOf"),
            null
          );
          const statementObjectPredicateSubjects = store.getSubjects(
            ns.rdf("object"),
            parent,
            null
          );

          const targetSubject = statementIds
            .filter((x) => statementSubjectPredicateSubjects.includes(x))
            .filter((x) => statementPredicatePredicateSubjects.includes(x))
            .filter((x) => statementObjectPredicateSubjects.includes(x));

          if (targetSubject.length === 0) {
            console.log("Nothing found");
            return;
          }

          if (targetSubject.length > 1) {
            console.error("Length greater than 1");
            return;
          }

          if (!parentAssignedUri) {
            parentAssignedUri = store.getObjects(
              targetSubject.shift()!,
              ns.example("assignedUri"),
              null
            )[0];
          }
          if (!parentLabel) {
            parentLabel = store.getObjects(
              targetSubject.shift()!,
              ns.rdfs("label"),
              null
            )[0];
          }
        }

        if (parentAssignedUri && parentLabel) {
          console.log("todo");
          parentInformation.push({
            id: <RDF.NamedNode>parentAssignedUri,
            label: <RDF.Literal>parentLabel,
          });
          // TODO
        }
      });

      return {
        ...(assignedUri && {
          id: assignedUri.value,
        }),
        /*...(definition && {
          definition: definition.value,
        }),*/

        ...(maxCount && {
          maxCount: maxCount.value,
        }),
        ...(minCount && {
          minCount: maxCount.value,
        }),
        ...(parentInformation.length > 0 && {
          parents: parentInformation, //: parents.forEach((parent) => {console.log(parent.id)}),
          //parent_label: class.forEach((quad) => {if (quad.value === parent.id) {quad.value}),
        }),

        ...(definitionInformation.length > 0 && {
          definitions: definitionInformation,
        }),
        ...(labelInformation.length > 0 && {
          labels: labelInformation,
        }),
        ...(scope && {
          scope: scope,
        }),
      };
    });
  }

  public async createRespecAttributes(store: N3.Store): Promise<any[]> {
    let language_value = "nl";
    const datatypes = store.getSubjects(
      ns.rdf("type"),
      ns.owl("DatatypeProperty"),
      null
    );
    const objectproperty = store.getSubjects(
      ns.rdf("type"),
      ns.owl("ObjectProperty"),
      null
    );

    const inPackageDataType = this.filterOnScope(datatypes, store);
    const inPackageObjectProperty = this.filterOnScope(objectproperty, store);

    return [...inPackageDataType, ...inPackageObjectProperty].map((subject) => {
      const assignedUri = store.getObjects(subject,ns.example("assignedUri"), null)[0];
      const definition = store.getObjects(subject, ns.rdfs("comment"), null)[0];


      
      const label = store.getObjects(subject, ns.rdfs("label"), null)[0];
      const maxCount = store.getObjects(subject, ns.owl("maxCount"), null)[0];
      const minCount = store.getObjects(subject, ns.owl("minCount"), null)[0];
      const domain = store.getObjects(subject, ns.rdfs("domain"), null)[0];
      const usageNote = store.getObjects(
        subject,
        ns.example("usageNote"),
        null
      )[0];
      const scope = store.getObjects(subject, ns.example("scope"), null)[0];
      

      return {
        ...(assignedUri && {
          id: assignedUri.value,
        }),
        ...(definition && {
          definition: definition.value,
        }),
        ...(label && {
          label: label.value,
        }),
        ...(maxCount && {
          maxCount: maxCount.value,
        }),
        ...(minCount && {
          minCount: minCount.value,
        }),

        ...(domain && {
          domain: domain.value,
        }),
        ...(usageNote && {
          usageNote: usageNote.value,
        }),
        ...(scope && {
          scope: scope.value,
        }),
      };
    });
  }


/*

  public async createRespecAttributes(store: N3.Store): Promise<any[]> {
    const datatypes = store.getSubjects(
      ns.rdf("type"),
      ns.owl("DatatypeProperty"),
      null
    );
    const objectproperty = store.getSubjects(
      ns.rdf("type"),
      ns.owl("ObjectProperty"),
      null
    );

    const assignedUri = store.getObjects(subject, ns.example("assignedUri"), null)[0];
    const definition = store.getObjects(subject, ns.rdfs("comment"), null)[0];
    const label = store.getObjects(subject, ns.rdfs("label"), null)[0];
    const maxCount = store.getObjects(subject, ns.owl("maxCount"), null)[0];
    const minCount = store.getObjects(subject, ns.owl("minCount"), null)[0];
     

    const inPackageDataType = this.filterOnScope(datatypes, store);
    const inPackageObjectProperty = this.filterOnScope(objectproperty, store);

    return [...inPackageDataType, ...inPackageObjectProperty].map((subject) => {
      // label, usagenote
      return {
        id: subject.value,
      };
    });
  }

*/

  //Authors
  public async createRespecAuthors(store: N3.Store): Promise<any[]> {
    const authors = store.getQuads(
      ns.rdf("type"),
      ns.foaf("Person"),
      ns.foaf("maker"),
      null
    );

    const inPackageAuthors = this.filterOnScope(authors, store);
    console.log(authors);
    return [inPackageAuthors].map((subject) => {
      // label, usagenote
      return {
        id: subject.values,
      };
    });
  }

  //editors
  /*
   "editors": {
        "@type": "foaf:Person",
        "@id": "rec:editor"
      },

*/

  //contributors
  /*
      "contributors": {
        "@type": "foaf:Person",
        "@id": "dcterms:contributor"
      }
*/

  //affiliation
  /*
      "affiliation": {
        "@id": "http://schema.org/affiliation"
      }
*/

  //Get all the properties of a class

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