import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import type { IGenerationService } from '@oslo-flanders/core';
import { ns, ServiceIdentifier, createN3Store } from '@oslo-flanders/core';

import type * as RDF from '@rdfjs/types';
import { inject, injectable } from 'inversify';

import type * as N3 from 'n3';
import * as nj from 'nunjucks';
import { HtmlRespecGenerationServiceConfiguration } from './config/HtmlRespecGenerationServiceConfiguration';

@injectable()
export class HtmlRespecGenerationService implements IGenerationService {
  public readonly configuration: HtmlRespecGenerationServiceConfiguration;

  public constructor(
    @inject(ServiceIdentifier.Configuration)
    config: HtmlRespecGenerationServiceConfiguration,
  ) {
    this.configuration = config;
  }

  public async run(): Promise<void> {
    const store = await createN3Store(this.configuration.input);
    const templateDir = resolve(`${__dirname}/respec`);
    nj.configure(templateDir, { autoescape: false });

    const [classes, attributes] = await Promise.all([
      this.createRespecClasses(store),
      this.createRespecAttributes(store),
    ]);

    const html = nj.render('index.njk', {
      name: 'Json Test',
      respecConfig: this.createRespecConfig(),
      classes,
      attributes,
    });
    writeFileSync('rendered.html', html);
    execSync(`npm --prefix ${__dirname}/.. run generate-respec`);
  }

  private createRespecConfig(): string {
    const config = {
      specStatus: 'unofficial',
      github: 'w3c/respec',
      editors: [{ name: 'Dwight', url: 'www.test.com' }],
      publishDate: new Date(),
      shortName: 'respec',
    };
    return `<script class="remove">var respecConfig = ${JSON.stringify(
      config,
    )}</script>`;
  }

  // Mijn column : editors, contributors, authors

  // CLASSES
  public async createRespecClasses(store: N3.Store): Promise<any[]> {
    const languageValue = 'nl';
    const classes = store.getSubjects(ns.rdf('type'), ns.owl('Class'), null);
    const inPackageClasses = this.filterOnScope(classes, store);
    return inPackageClasses.map(subject => {
      const assignedUri = store
        .getObjects(subject, ns.example('assignedUri'), null)
        .shift();

      const maxCount = store
        .getObjects(subject, ns.owl('maxCount'), null)
        .shift();
      const minCount = store
        .getObjects(subject, ns.owl('minCount'), null)
        .shift();
      const parents = store.getObjects(subject, ns.rdfs('subClassOf'), null);
      const parentAssignedUris: RDF.NamedNode[] = [];
      const definition = store
        .getObjects(subject, ns.rdfs('comment'), null)
        .find(x => (<RDF.Literal>x).language === this.configuration.language);
      const label = store
        .getObjects(subject, ns.rdfs('label'), null)
        .find(x => (<RDF.Literal>x).language === this.configuration.language);

      parents.forEach(parent => {
        // Console.log("parents", parent.id);
        let parentAssignedUri = store
          .getObjects(parent, ns.example('assignedUri'), null)
          .shift();
        if (!parentAssignedUri) {
          const statementIds = store.getSubjects(
            ns.rdf('type'),
            ns.rdf('Statement'),
            null,
          );
          const statementSubjectPredicateSubjects = store.getSubjects(
            ns.rdf('subject'),
            subject,
            null,
          );
          const statementPredicatePredicateSubjects = store.getSubjects(
            ns.rdf('predicate'),
            ns.rdfs('subClassOf'),
            null,
          );

          const statementObjectPredicateSubjects = store.getSubjects(
            ns.rdf('object'),
            parent,
            null,
          );
          const targetSubjects = statementIds
            .filter(x =>
              statementSubjectPredicateSubjects.some(y => y.value === x.value))
            .filter(x =>
              statementPredicatePredicateSubjects.some(
                y => y.value === x.value,
              ))
            .filter(x =>
              statementObjectPredicateSubjects.some(y => y.value === x.value));

          if (targetSubjects.length > 1) {
            throw new Error(`Found multiple statements with subject .`);
          }
          const targetSubject = targetSubjects.shift();

          if (targetSubject) {
            parentAssignedUri = store
              .getObjects(targetSubject, ns.example('assignedUri'), null)
              .shift();
          }
        }
        if (parentAssignedUri) {
          parentAssignedUris.push(<RDF.NamedNode>parentAssignedUri);
        }
      });

      return {
        ...assignedUri && {
          id: assignedUri.value,
        },
        ...maxCount && {
          maxCount: maxCount.value,
        },
        ...minCount && {
          minCount: minCount.value,
        },
        ...parentAssignedUris.length > 0 && {
          parents: parentAssignedUris.values,
        },

        ...definition && {
          definition: definition.value,
        },
        ...label && {
          label: label.value,
        },
      };
    });
  }

  // ATTRIBUTES
  public async createRespecAttributes(store: N3.Store): Promise<any[]> {
    const datatypes = store.getSubjects(
      ns.rdf('type'),
      ns.owl('DatatypeProperty'),
      null,
    );
    const objectproperties = store.getSubjects(
      ns.rdf('type'),
      ns.owl('ObjectProperty'),
      null,
    );

    const inPackageDataType = this.filterOnScope(datatypes, store);
    const inPackageObjectProperty = this.filterOnScope(objectproperties, store);

    return [...inPackageDataType, ...inPackageObjectProperty].map(subject => {
      const assignedUri = store
        .getObjects(subject, ns.example('assignedUri'), null)
        .shift();
      // Filter out array label from graph
      const definition = store
        .getObjects(subject, ns.rdfs('comment'), null)
        .find(x => (<RDF.Literal>x).language === this.configuration.language);
      const label = store
        .getObjects(subject, ns.rdfs('label'), null)
        .find(x => (<RDF.Literal>x).language === this.configuration.language);

      // SubPropertyOf TODO ------------------------------------------------------------------------------------------

      const maxCount = store
        .getObjects(subject, ns.shacl('maxCount'), null)
        .shift();
      // Console.log(maxCount);
      const minCount = store
        .getObjects(subject, ns.shacl('minCount'), null)
        .shift();
      const domain = store.getObjects(subject, ns.rdfs('domain'), null).shift();
      const usageNote = store
        .getObjects(subject, ns.vann('usageNote'), null)
        .find(x => (<RDF.Literal>x).language === this.configuration.language);
      // Console.log(usageNote);
      return {
        ...assignedUri && {
          id: assignedUri.value,
        },
        ...definition && {
          definition: definition.value,
        },
        ...label && {
          label: label.value,
        },

        ...maxCount && {
          maxCount: maxCount.value,
        },
        ...minCount && {
          minCount: minCount.value,
        },
        ...domain && {
          domain: domain.value,
        },
        ...usageNote && {
          usageNote: usageNote.value,
        },
      };
    });
  }

  // Authors
  public async createRespecAuthors(store: N3.Store): Promise<any[]> {
    const authors = store.getQuads(
      ns.rdf('type'),
      ns.foaf('Person'),
      ns.foaf('maker'),
      null,
    );

    const inPackageAuthors = this.filterOnScope(authors, store);
    console.log(authors);
    return [inPackageAuthors].map(subject =>
    // Label, usagenote
    ({
      id: subject.values,
    }));
  }

  // Editors
  //
  // "editors": {
  //      "@type": "foaf:Person",
  //      "@id": "rec:editor"
  //    },
  //
  //

  // contributors
  //
  //  "contributors": {
  //    "@type": "foaf:Person",
  //    "@id": "dcterms:contributor"
  //  }
  //

  // affiliation
  //
  //  "affiliation": {
  //    "@id": "http://schema.org/affiliation"
  //  }
  //

  // Get all the properties of a class

  private filterOnScope(
    subjects: RDF.Quad_Subject[],
    store: N3.Store,
  ): RDF.Quad_Subject[] {
    return subjects.filter(subject => {
      const scopes = store.getObjects(subject, ns.example('scope'), null);

      if (scopes.length === 0) {
        throw new Error(`No scope found for ${subject}.`);
      }
      const scope = scopes.shift()!;
      if (
        scope.value === 'https://data.vlaanderen.be/id/concept/scope/InPackage'
      ) {
        return true;
      }
    });
  }
}
