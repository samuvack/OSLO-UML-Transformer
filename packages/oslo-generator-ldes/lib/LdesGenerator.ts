import type { GeneratorConfiguration } from '@oslo-flanders/configuration';
import type { LdesWritableConnector, OsloLdesMember } from '@oslo-flanders/core';
import { ns, Generator } from '@oslo-flanders/core';
import type * as RDF from '@rdfjs/types';
import { SHA256 } from 'crypto-js';
import { DataFactory } from 'rdf-data-factory';

export class LdesGenerator<T extends GeneratorConfiguration> extends Generator<GeneratorConfiguration> {
  private readonly factory: DataFactory;
  private _connector: LdesWritableConnector<T> | undefined;

  public constructor() {
    super();
    this.factory = new DataFactory();
  }

  public async generate(data: string): Promise<void> {
    const store = await this.createRdfStore(data, this.configuration.language);
    const documentUrl = `${this.configuration.baseUri}${this.configuration.documentId}`;

    const tasks: Promise<void>[] = [];

    const objectIds = store.getObjects(this.factory.namedNode(documentUrl), null, null);
    objectIds.forEach(objectId => {
      const quads = store.getQuads(objectId, null, null, null);
      const member = this.createMember(quads, objectId);

      tasks.push(this.connector.writeVersion(member));
    });

    await Promise.all(tasks).then(() => this.connector.stop());
  }

  public async init(config: GeneratorConfiguration): Promise<void> {
    await super.init(config);

    if (!config.ldesBackendConnectorPackageName) {
      throw new Error(`LdesWritableConnector is not configured. Please set value for 'ldesBackendConnectorPackageName' in configuration.`);
    }

    const WritableConnectorPackage = require(config.ldesBackendConnectorPackageName);
    const connectorName = Object.keys(WritableConnectorPackage).find(key => key.endsWith('Connector'));

    if (!connectorName) {
      throw new Error(`WritableConnector ${config.ldesBackendConnectorPackageName} could not be loaded correctly!`);
    }

    this.connector = new WritableConnectorPackage[connectorName]();
    await this.connector.init(<T>this.configuration);
  }

  private createMember(objectQuads: RDF.Quad[], objectId: RDF.Quad_Object): OsloLdesMember {
    const memberQuads: RDF.Quad[] = [];

    // We assume that everything is present (except description)
    const type = objectQuads.find(x => x.predicate.equals(ns.rdf('type')))!;
    const label = objectQuads.find(x => x.predicate.equals(ns.rdfs('label')))!;
    const definition = objectQuads.find(x => x.predicate.equals(ns.rdfs('comment')));
    const scope = objectQuads.find(x => x.predicate.equals(ns.example('scope')))!;
    const guid = objectQuads.find(x => x.predicate.equals(ns.example('guid')))!;

    // TODO: is it necessary to calculate a new guid?
    const versionId = SHA256(JSON.stringify({ guid, documentId: this.configuration.documentId })).toString();
    const versionUriNamedNode = this.factory.namedNode(`${this.configuration.baseUri}/id/terminology/${versionId}`);
    const context = this.factory.namedNode(`${this.configuration.baseUri}/${this.configuration.documentId}`);

    // TODO: add timestamp

    memberQuads.push(
      this.factory.quad(
        versionUriNamedNode,
        ns.rdf('type'),
        type.object,
        context,
      ),
      this.factory.quad(
        versionUriNamedNode,
        ns.adms('isVersionOf'),
        objectId,
        context,
      ),
      this.factory.quad(
        versionUriNamedNode,
        ns.skos('prefLabel'),
        label.object,
        context,
      ),
      this.factory.quad(
        versionUriNamedNode,
        ns.example('scope'),
        scope.object,
        context,
      ),
      this.factory.quad(
        versionUriNamedNode,
        ns.dcterms('created'),
        this.factory.literal(new Date(Date.now()).toISOString(), ns.xsd('string')),
      ),
    );

    if (definition) {
      memberQuads.push(
        this.factory.quad(
          versionUriNamedNode,
          ns.rdfs('comment'),
          definition.object,
          context,
        ),
      );
    }

    return {
      id: versionUriNamedNode.value,
      quads: memberQuads,
    };
  }

  public get connector(): LdesWritableConnector<T> {
    if (!this._connector) {
      throw new Error(`LdesWritableConnector is not set yet.`);
    }

    return this._connector;
  }

  public set connector(value: LdesWritableConnector<T>) {
    this._connector = value;
  }
}
